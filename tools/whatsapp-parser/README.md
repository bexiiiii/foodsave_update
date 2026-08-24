# pate-boxes-check

# Запуск сайта

cd /home/shindenis/programming-projects/pate
python3 server.py

Тесты:
python3 -m py_compile server.py parse_daily.py upload_to_crm.py
python3 -m unittest discover -s tests -v
curl -s -X POST <http://127.0.0.1:8000/api/parse> ...

Старые без сайта именно скриптом тесты
cd /home/shindenis/programming-projects/pate
python3 -m pip install requests pymupdf pytesseract pillow --break-system-packages
cp config.example.json config.json
python3 -m unittest discover -s tests -v
python3 parse_daily.py message_examples.txt catalog_paste.json > result.json
python3 upload_to_crm.py result.json --config config.json --dry-run
