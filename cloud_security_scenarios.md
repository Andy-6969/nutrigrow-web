# Skenario Keamanan Cloud: Project Nutrigrow (Next.js + Supabase Cloud + IoT)

Dokumen ini disusun untuk menganalisis skenario ancaman keamanan cloud (*cloud security threat scenarios*), kerentanan (*vulnerability*), serta langkah mitigasi pada sistem **Nutrigrow**. 

Nutrigrow menggunakan arsitektur modern berbasis hybrid: **Next.js (Frontend/Serverless)**, **Supabase Cloud (BaaS/PostgreSQL)**, dan **Hardware IoT (NodeMCU/ESP32)**.

---

## 1. Ringkasan Arsitektur & Batas Kepercayaan (Trust Boundaries)

Sebelum menganalisis skenario ancaman, penting untuk memahami batasan sistem di mana data bergerak antar zona keamanan:

```mermaid
graph TD
    subgraph Client Zone (Untrusted)
        Browser[Web Browser / Dashboard]
        IoT[Perangkat IoT / ESP32]
    end

    subgraph Serverless / Gateway Zone (Semi-Trusted)
        NextJS[Next.js App Router / Server Actions]
    end

    subgraph Cloud BaaS Zone (Trusted)
        SupaAuth[Supabase Auth]
        SupaDB[(Supabase PostgreSQL Database)]
        SupaReal[Supabase Realtime API]
    end

    Browser -- HTTPS / Anon Key --> SupaAuth
    Browser -- Row Level Security RLS --> SupaDB
    NextJS -- Service Role Key / No RLS --> SupaDB
    IoT -- HTTP POST / API Key --> SupaDB
```

*   **Batas Kepercayaan 1 (Browser -> Supabase):** Menggunakan kunci publik (`anon_key`). Rangkaian data di sini harus dilindungi oleh **Row Level Security (RLS)** karena *anon key* dapat diakses oleh siapa saja.
*   **Batas Kepercayaan 2 (IoT -> Database):** Perangkat IoT mengirimkan data langsung. Keamanan bergantung pada kekuatan API Key yang disimpan di mikrokomputer/ESP32.
*   **Batas Kepercayaan 3 (Next.js Server -> Database):** Menggunakan `service_role` key yang melewati RLS. Zona ini harus benar-benar steril dari paparan ke sisi browser (*client-side*).

---

## Skenario 1: Kebocoran Data Antar Pengguna via RLS Bypass (BOLA)

### A. Deskripsi Ancaman
*   **Klasifikasi OWASP API:** *API1:2023 Broken Object Level Authorization (BOLA)* / *Bypassing Access Control*.
*   **Skenario:** Penyerang mendaftar sebagai pengguna biasa di Nutrigrow (misalnya, Petani A). Penyerang kemudian menginspeksi lalu lintas jaringan (*Network Tab* di browser) untuk mengambil kunci `anon_key` dan token JWT miliknya. Menggunakan *tools* seperti Postman atau curl, penyerang mengirimkan permintaan HTTP langsung ke API REST Supabase (`https://vvlyigwzfcosxramfzpb.supabase.co/rest/v1/sensor_data`) namun mengganti parameter `zone_id` atau `farm_id` dengan milik Petani B.

### B. Kerentanan pada Cloud
*   Tabel sensitif seperti `sensor_data`, `zones`, atau `farms` tidak mengaktifkan **Row Level Security (RLS)**, atau kebijakan (policies) RLS tidak memvalidasi kepemilikan data berdasarkan user yang sedang login (`auth.uid()`).

### C. Dampak Bisnis & Operasional
*   Kebocoran data kelembapan tanah, suhu, dan rahasia formula nutrisi tanaman milik kompetitor.
*   Kehilangan privasi pengguna dan reputasi platform menurun.

### D. Langkah Mitigasi (Teknis)
1.  **Aktifkan RLS secara menyeluruh:**
    ```sql
    ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
    ```
2.  **Terapkan Kebijakan Berbasis Hubungan Pengguna (Relational Policy):**
    Buat kebijakan RLS yang memastikan pengguna hanya dapat membaca/menulis data jika `farm_id` mereka sesuai dengan profil mereka di tabel `user_profiles`:
    ```sql
    CREATE POLICY "User can read sensor data of their own farm" 
    ON public.sensor_data
    FOR SELECT 
    USING (
      zone_id IN (
        SELECT z.id FROM public.zones z
        JOIN public.user_profiles up ON z.farm_id = up.farm_id
        WHERE up.id = auth.uid()
      )
    );
    ```

---

## Skenario 2: Eksploitasi & Pemalsuan Data Telemetri IoT (Spoofing & Injection)

### A. Deskripsi Ancaman
*   **Klasifikasi OWASP:** *Spoofing Identity* / *Data Integrity Attack*.
*   **Skenario:** Perangkat IoT (ESP32/NodeMCU) di lapangan tidak memiliki enkripsi penyimpanan chip (flash encryption) yang memadai. Penyerang mencuri fisik perangkat IoT atau mengendus (*sniffing*) lalu lintas jaringan HTTP yang tidak terenkripsi dari IoT ke cloud. Penyerang berhasil mendapatkan **IoT API Key** yang tertanam pada kode perangkat. Penyerang lalu mengirimkan data telemetri palsu (misal: suhu `100°C` atau kelembapan `0%`).

### B. Kerentanan pada Cloud
*   Penggunaan API Key statis tanpa enkripsi transit (HTTPS) dan tidak adanya validasi batas kewajaran nilai sensor (*input sanitization* / *anomaly detection*) di sisi cloud.
*   Perangkat IoT melakukan penulisan langsung ke tabel database tanpa melalui fungsi perantara yang membatasi hak akses.

### C. Dampak Bisnis & Operasional
*   Sistem otomatisasi penyiraman (*Eco-mode* atau algoritma *Fuzzy Logic*) menerima data kelembapan tanah `0%` palsu. Akibatnya, katup air otomatis terbuka terus-menerus, menyebabkan banjir lahan, pemborosan air, serta kerusakan pompa air.

### D. Langkah Mitigasi (Teknis)
1.  **Gunakan HTTPS Transit:** Wajibkan protokol `HTTPS` (port 443) pada perangkat ESP32 untuk menghindari *Man-in-the-Middle (MitM)* attack.
2.  **Gunakan Database RPC (Remote Procedure Call) Terisolasi:** Jangan biarkan IoT menulis langsung ke tabel `sensor_data`. Buat fungsi PostgreSQL (RPC) yang terenkapsulasi dengan parameter ketat dan validasi nilai di sisi database:
    ```sql
    CREATE OR REPLACE FUNCTION insert_device_telemetry(
      p_device_key TEXT,
      p_temp NUMERIC,
      p_humidity NUMERIC
    ) RETURNS VOID AS $$
    DECLARE
      v_zone_id UUID;
    BEGIN
      -- Validasi API Key perangkat
      SELECT zone_id INTO v_zone_id FROM public.iot_api_keys 
      WHERE key = p_device_key AND active = TRUE;

      IF v_zone_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized IoT Device';
      END IF;

      -- Validasi Anomali Data (Sanitasi Input)
      IF p_temp < -10 OR p_temp > 60 THEN
        RAISE EXCEPTION 'Nilai suhu di luar batas wajar';
      END IF;

      INSERT INTO public.sensor_data(zone_id, temperature, humidity, recorded_at)
      VALUES (v_zone_id, p_temp, p_humidity, NOW());
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```

---

## Skenario 3: Kebocoran Token Admin (Privilege Escalation via Service Role Key)

### A. Deskripsi Ancaman
*   **Klasifikasi OWASP:** *Broken Authentication* / *Security Misconfiguration*.
*   **Skenario:** Pengembang tidak sengaja menggunakan Supabase `service_role` key pada variabel lingkungan sisi frontend Next.js yang diekspos ke publik (misal diberi prefix `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`). Penyerang memeriksa file bundle Javascript di browser, menemukan kunci tersebut, dan memanfaatkannya untuk menghapus seluruh isi database karena kunci `service_role` secara default melewati semua aturan RLS (berfungsi sebagai Superadmin/Bypass RLS).

### B. Kerentanan pada Cloud
*   Kelalaian konfigurasi variabel lingkungan (*Environment Variables*) di penyedia cloud hosting (Vercel, AWS, GCP) dan pengabaian prinsip *Least Privilege* di sisi frontend.

### C. Dampak Bisnis & Operasional
*   Kehilangan seluruh data operasional pertanian secara instan (data hilang permanen jika tidak ada cadangan).
*   Sistem Nutrigrow lumpuh total (*Denial of Service* secara data).

### D. Langkah Mitigasi (Teknis)
1.  **Pemisahan Kunci Secara Ketat:**
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Aman diekspos ke browser (karena dibatasi RLS).
    *   `SUPABASE_SERVICE_ROLE_KEY`: **HARUS** disimpan sebagai rahasia server saja. Jangan pernah menambahkan prefix `NEXT_PUBLIC_`.
2.  **Gunakan Server-Only Context di Next.js:**
    Gunakan paket `server-only` di Next.js pada file yang menggunakan kunci sensitif agar kode tidak sengaja ter-import ke sisi client:
    ```javascript
    import 'server-only';
    
    // Kode inisialisasi supabase admin yang aman di sisi server saja
    import { createClient } from '@supabase/supabase-js';
    export const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Hanya dibaca di sisi server
    );
    ```
3.  **Terapkan CI/CD Secret Scanner:** Gunakan GitGuardian atau GitHub Secret Scanning untuk mencegah penulisan kunci sensitif ke repositori git.

---

## Skenario 4: SQL Injection pada Fitur Kustom Grafik Analisis

### A. Deskripsi Ancaman
*   **Klasifikasi OWASP:** *A3:2021-Injection*.
*   **Skenario:** Nutrigrow memiliki fitur pencarian riwayat data sensor dengan rentang waktu dinamis. Untuk memproses filter tersebut, fungsi database (RPC) menggabungkan string query secara dinamis (*Dynamic SQL execution*). Penyerang mengirimkan input rentang waktu berupa string berbahaya seperti: `'10m'; DROP TABLE sensor_data; --`.

### B. Kerentanan pada Cloud
*   Penggunaan perintah `EXECUTE` pada PostgreSQL dengan penggabungan string langsung (*string concatenation*) tanpa melakukan parameterisasi input (*parameter binding*).

### C. Dampak Bisnis & Operasional
*   Penghapusan tabel secara tidak sah, pencurian data profil pengguna, atau manipulasi data penggunaan air pada kalkulator *Eco-Savings*.

### D. Langkah Mitigasi (Teknis)
1.  **Hindari SQL Dinamis Jika Memungkinkan:** Gunakan query statis PostgreSQL dengan parameter bawaan:
    ```sql
    -- Contoh aman (Menggunakan parameter binding bawaan):
    SELECT * FROM public.sensor_data 
    WHERE recorded_at >= NOW() - p_time_range::INTERVAL;
    ```
2.  **Sanitasi dengan Fungsi `format()` jika terpaksa menggunakan SQL Dinamis:**
    Jika nama tabel atau kolom harus dinamis, gunakan fungsi pengaman PostgreSQL `format()` dengan parameter `%I` (untuk identifier/nama kolom/tabel) dan `%L` (untuk literal/nilai input):
    ```sql
    -- Contoh aman dengan dynamic query:
    EXECUTE format('SELECT * FROM %I WHERE status = %L', v_table_name, p_status_value);
    ```

---

## 5. Matriks Risiko Keamanan Cloud Nutrigrow

Sebagai pelengkap tugas kuliah Anda, berikut adalah matriks analisis risiko (*Risk Assessment Matrix*) untuk menentukan prioritas mitigasi:

| ID Ancaman | Skenario Ancaman | Dampak (*Impact*) | Kemungkinan (*Likelihood*) | Tingkat Risiko (*Risk Level*) | Solusi Utama |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-01** | Kebocoran Data (RLS Bypass) | **Tinggi (High)** | **Sedang (Medium)** | **Tinggi (High)** | Aktifkan RLS pada seluruh tabel. |
| **T-02** | Data IoT Palsu (Spoofing) | **Sedang (Medium)**| **Tinggi (High)** | **Tinggi (High)** | Validasi ambang batas data di RPC server. |
| **T-03** | Kebocoran Kunci Service Role | **Kritis (Critical)**| **Rendah (Low)** | **Tinggi (High)** | Rahasiakan Server-Side API Keys. |
| **T-04** | SQL Injection pada Analytics | **Tinggi (High)** | **Rendah (Low)** | **Sedang (Medium)** | Gunakan *Parameterized Query* (Binding). |

---

> [!TIP]
> **Rekomendasi untuk Tugas Kuliah Keamanan Cloud:**
> Dalam menyusun laporan, Anda bisa menekankan bahwa keuntungan utama menggunakan arsitektur cloud seperti **Supabase** adalah penyediaan *out-of-the-box infrastructure security* (seperti enkripsi data at rest & transit). Namun, **tanggung jawab keamanan data (Shared Responsibility Model)** tetap ada di tangan pengembang, terutama dalam mengonfigurasi aturan akses data via **RLS Policies** dan pengelolaan **API keys**.
