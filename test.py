# 프로젝트 루트에서 python 실행
import imaplib
import os
from dotenv import load_dotenv
load_dotenv()

mail = imaplib.IMAP4_SSL('imap.daum.net', 993)
mail.login(os.getenv('DAUM_EMAIL'), os.getenv('DAUM_PASSWORD'))

# 나라장터 폴더 선택 (안 읽은 메일 있는 폴더)
mail.select('\"나라장터\"', readonly=True)

# 전체 검색
_, all_data = mail.search(None, 'ALL')
print('ALL:', len(all_data[0].split()) if all_data[0] else 0, '건')

# 읽은 것만
_, seen_data = mail.search(None, 'SEEN')
print('SEEN:', len(seen_data[0].split()) if seen_data[0] else 0, '건')

# 안 읽은 것만
_, unseen_data = mail.search(None, 'UNSEEN')
print('UNSEEN:', len(unseen_data[0].split()) if unseen_data[0] else 0, '건')

mail.logout()
