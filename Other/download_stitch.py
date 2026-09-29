import os
import subprocess
import urllib.request
import json

data = [
    {
        "title": "SMS Transaction Review",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDFjZmNhNDMwNzc5YTQ5NzIzMDI2YzY0EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1X8E1Ryj2NSx2SffMUVOHmk8VY5WJw4QwH-tZr0mRIsORZ5QvV-DphY7vPnuiBRH3-NpbLJUUx_HTxWLT00H2feF4q1y-RBJ6xqFmQfz7vq4wvjvKj0xq7LXfi6JwYq7XhZWnwjxpA4RbO2krDI8z_1J9UjpZQq4CBHRPEHIUo10a7EKGO-FhYMkLh9lPu0yhKXhwv5jFTE61gZLPnHaLonrHPE1rOXzyswyx3ZMpKaADu46mnFtfUqyW8h",
        "ext": "html"
    },
    {
        "title": "Financial Insights & Intelligence",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMzJjOGI0NzgwNjM5NzVhNzJhMDE5NGJiEgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1Xsg_JrwglnNuVOaLp2FkTIzx7CLdraieVqmZt1U2AdMFfRYqjV4pv-PG_DfhF0x9xF1yji5oY3R91UGcnoth6TBlovQKmSFmULV6edUTCo2NjskeP1INwIKXh_V4AGgRGAsGppaCLQ7PoI12wpbQZQEGeCmW-w2NTi7PG8TZE9s24HvMOmIsxW4gaRuOGelSJDqx8kEAYTsujtJBXs3Sx7OobWkASN5Tmxz3O6BsbpUHSBKMR9fjLaFaY",
        "ext": "html"
    },
    {
        "title": "DESIGN.md",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBKOARIhYXBwX2NvbXBhbmlvbl91c2VyX3VwbG9hZGVkX2ZpbGVzGmkKM3VzZXJfdXBsb2FkZWRfaHRtbF8wMDA2NWM3OWU1ZGI5N2I1MDczYWYxMzIxODA2OTlkNBILEgcQ99r5_ccHGAGSASQKCnByb2plY3RfaWQSFkIUMTY4MDYxNzY0MTI1Nzk4NjkwNjU&filename=&opi=89354086",
        "img_url": None,
        "ext": "md"
    },
    {
        "title": "Home - Animated Floating Navigation",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDEyODNlMDQwNTRjYzc0Nzg4MDI1MTdjEgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1UXkUlPsdrCmwOnXZP-44C6nRrF1ty1nyRYE8epQ5Wsq3KaxSK5xHgnFNLDBuAB337earIltAdbt8YbqyyngsTsslqyFYK4uLuDOMl0MZGkP3Q98Zr-05n8avxmxjWs0u_cDMe6LE67xGHwngkrDH11kEDvyNTjOtzUo1ue62StyN6JSjOMPZ33yYAV6TVBqYMX2rjqzysvYp1KiiHLXqapatV2PZCCxugF4PWnubMiW64KNIADaRsb4LFA",
        "ext": "html"
    },
    {
        "title": "Widget Configuration & Privacy",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMjY2MWVmZjkwMjhmMDllOTI0MjhhYTc4EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1Wo0CZwrHhkNKtJUi-cBfxgU8CHK6c7VVvwcUJ26JijPgBwIOVWtMbhXwDOgYYJu_n78jHjczh3zmkN3YcTvDqBwBGAIgbqLZrK6XD3pWTRpf6beLfvFQVEfJRFDMKOBba5uPxlzodW2zs-DMVU7Ipfzk2JaCGpiuXMEvkvFiUC2LHh_X5lHEiKaFkpjrRnSmm-S5-AERfNqnqIEqF87aOlvdYlFkmybfligMlT06Bb-rTQJSi2QUDAwpee",
        "ext": "html"
    },
    {
        "title": "Home-Screen Widget Experience",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMzU4MGVlZWUwOTEwNGYwZjdkMTVjN2QzEgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1XmnkOPTXBSu1_HQEsZlMqo_sZ19Xda7Uk7geg38RFDHLnTn0PWRtHiCwEr0tgsCntN733DpRIqfLAlxg3ptr5nZnBBZ3THz4oilv7QCVnZawW7PBNjsjlz5qfMuAP8QZpZVJbqp4juC5GgusXNscZJVBK_hZV5La6ZRX1hk3RkGzPWp3QJlhYKQv15QJqgMIEd5kLLiGz6syjZnptO4T6aZTXoQt7b1PQnQP-1MK1emrr8-2VCDkkWwNcR",
        "ext": "html"
    },
    {
        "title": "App Unlock - OTP & Biometrics",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDJjMTI5MWYwOTEwNGY4NThhMzA5NGM0EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1VA-7hlZQ8vV7PW415aZ7zj6PoUsQLb7NU-yyZOvsBzdZ3BKEBGOsSWwvlp0vBQjfEExcnpegxKfYOieYwpL_RFtOlqE4fzr4veIPdus4J64A2gsgjHpR71396Y5BSEWmiemTn3WG3yTGwNEOMumAGLe02NCDVNNxW0xqjYLz1XRb_JqSaielM0IyNI9g0GYkjXbSnXrmaM_pmW6j9oFG3cPsUVxa4C07-C-IaO2FOP3PCCraMTDkQJrg2U",
        "ext": "html"
    },
    {
        "title": "AI Advisor - Financial Assistant",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMzMzNzY3MzgwMzkyY2JiMjdiMWNlYzQ1EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1XJO-zGme-mQMmoZVDVAIXDztZnimpDANtQdhimk8WD3Lm_-L3n9Rg5ZuneqGQroHTrmQ6wV2XXusywPKw_u6_NbtbAJariCIkLUCC_XxKe1f9UyiayAZxKyn8udYE3HvJ4z92ztQ-IY4LLskGwOJgnGKr9ZbzpYJYxjr2xhmYW3-MoxQpj2gAor2D3V9j-2qUALcuPKeNQx15EPdRmQB7C5Mk3c4Cl7qRRbaYiQIpQFlMm4E4Ede7QRZs",
        "ext": "html"
    },
    {
        "title": "Login to PFinanc",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDI4NjJiYTMwNTNiNzQ3ZDNkMzk3NTEwEgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1VUIH8_Tcc00H2mP4X0494K_iiaAIkwruSea1Ljmh3zuNfNPdaIEVFzXSNiqRgOwxsU-odmKum4XfSRFn3xaEitReIucfkKu58GSM7_zfZa_vBWsww_9-C4BtN9Ggpo9hyEfnSpy9M0EqyemBtRsoBR5nEwEtln1jjTOctNAJrNnoCQ6sS-p0UWy8FGPNFn8gJ4FHqzuAOYeTEm2CxGratHdT7DkbINX9imQs_eaRyvPYk0toyEQ3msaLyf",
        "ext": "html"
    },
    {
        "title": "Add Expense",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDIyMmZiMjQwNDMxMDRlOWM1MGQzODQ3EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1VzW7yQPONCR99Os5uKNajS3P84KfditGa9UCvMzduwTeBZVpDqXbQKoQ5i_S1ohBNt8byb23t1dPagdtJ5PIb73sIoH3CJ4I_8rcKUTwR50paE_C6dYG0QvHXDn_TMR821yWfqKef_ubF4A9R-zMCPsrOxhwhdgh0uPIIm0fvg8G6wRU_VABkgcqfz8xsbH76u8KvXcnOFxiw3caLPrxLKPb7mvnvtIVP3VmMUv3dM0poxBPHUd-j35bdf",
        "ext": "html"
    },
    {
        "title": "Transactions Ledger",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhNDM0MTA5YWYwMzkyY2JiMjdiMWNlYzQ1EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1V2wgap_YB25C0hIVeUct-anJNOmrlzf-ZCKTkJ406-r1DOxKEDCzGOdGCS7vl667heRfW2L7CC4JvflQP0xSWOBujZgVaz8CZBZ07shOC97Dwud_QSlDn_Re2g4CAwH23STBqMR0_r74FpiEqFoq1A0qLWLJ3NDmcVMn0Cf2Fp1RWUHFeSz2lhc3ZFkH6c0Ki73alZ33Yk_v85iAlWlxgcQ_Ff6sWclwVwiRVWJrgTimpEIBjI138HK-b2",
        "ext": "html"
    },
    {
        "title": "Investments & Portfolio",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMmRiYTBiZDMwODlhZjcyYWVlMDc3ZTA3EgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1USfOrst2Oc5JivqJkElkqEYcpn_2y5Di_ULzc3O-kuWFH0ocIy_KWDJGyK0On5r7syL-PgwRMqPaJoWeaNqJGZOLtrB6rEzk44sf1MkXIqnBngOUm-hoXpSDGS2zV9BGA1-t_NlBPiovCQURXUX5C8hVOCYJY1hFBZ_oJUkQV5C-7oqq1AP7kFVhbtd8naVTV0D0u6e2sfzokk1P3ATSmIeCFxYSZlMlxz_8t2i9twCBOPxA7I5uUTYCYe",
        "ext": "html"
    },
    {
        "title": "More Hub & Settings",
        "code_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzdhMmRjMzY2YmUwNTc2MzE1NWNiMzAwYTkwEgsSBxD32vn9xwcYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjgwNjE3NjQxMjU3OTg2OTA2NQ&filename=&opi=89354086",
        "img_url": "https://lh3.googleusercontent.com/aida/AEtjO1VupEpWs1K2ni6IXxLHHD3SDBl7Fby0SatBQeoFlhU3ry6XlWoTsQqOHl7LorQuO3MURfRxyE94g_KIzs_e2e3mSCzFT9VYlegrEL1BqDnklJXyfafsZZ4m_AKr93ifdDxsgbsqGhfnvmjLU1M3rsmvFIUPKxAXptb4ZKDX-eC_RxjgnDGkjcjppBwa6MKQXAhZhYiS3awpRimD5mH8pV1W6lgw6yNZ87o5GJpgNmncE1i2R_jgodAQLdtu",
        "ext": "html"
    }
]

out_dir = r"e:\Projects\PFinanc\Stitch-PFinanc"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

import string
valid_chars = "-_.() %s%s" % (string.ascii_letters, string.digits)

for item in data:
    title = item['title']
    safe_title = ''.join(c for c in title if c in valid_chars).strip()
    if safe_title == "DESIGN.md":
        code_file = os.path.join(out_dir, safe_title)
    else:
        code_file = os.path.join(out_dir, f"{safe_title}.{item['ext']}")
    
    img_file = os.path.join(out_dir, f"{safe_title}.png")

    print(f"Downloading code for {title}...")
    subprocess.run(['curl.exe', '-sSL', item['code_url'], '-o', code_file], check=True)
    
    if item['img_url']:
        print(f"Downloading image for {title}...")
        subprocess.run(['curl.exe', '-sSL', item['img_url'], '-o', img_file], check=True)
