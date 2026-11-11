---
name: 영상편집
description: 내 쇼츠 편집 스킬(my-editor). 음성/영상 파일을 주면 받아쓰기 → 쉼 줄이기 → 실제 화면 캡처 → HyperFrames 자막·모션그래픽 → 렌더 → 자동 검사까지 한다. "편집 스킬로", "쇼츠 편집해 줘", "영상편집" 요청에 사용.
---

# 내 편집 스킬

## 절대 규칙 (내가 준 피드백, 날짜순으로 계속 추가)
- 화면은 실제 사이트 캡처·실제 실행 녹화만. 목업 카드·가짜 터미널 금지.
- 맨 위 제목은 첫 화면부터 고정. 흐릿하게 나타나지 않게.
- 자막은 단어가 나오는 순간에 하나씩. 강조 단어는 주황색.
- 한 화면을 1.5초 넘게 가만히 두지 않기(줌·하이라이트·칩 등장).
- 2026-11-11: "문장마다 말하는 사이트를 실제로 열어서 캡처해 줘. 강조할 문구의 위치(좌표)도 같은 실행에서 같이 뽑아 줘. 목업이나 가짜 화면은 만들지 마."
- 2026-11-11: "렌더가 끝나면 사람한테 보여주기 전에 꼭 검사해 줘.
  1) 입 모양 싱크: 영상 속 소리와 원본 음성 파일의 시차가 0ms인지
  2) 개인 정보: 0.5초마다 한 장씩 화면 글자를 읽어서 이메일·API 키·계정 ID(UUID)가 보이면 실패
  3) 소리 크기: -14 LUFS(유튜브·인스타 기준)인지
  하나라도 실패하면 고치고 다시 렌더해."

## 순서
1. Whisper로 단어마다 시각 받아쓰기 → words.json
2. 쉼 0.18초 초과분은 0.12초만 남기고 자르기(목소리 속도 유지)
3. 문장마다 실제 사이트 캡처 + 강조 문구 좌표(같은 실행에서)
4. /hyperframes 로 1080x1920 조립, words.json 시각에 맞춰 자막·하이라이트
5. 렌더 후 -14 LUFS로 맞추기
6. 검사: 입 모양 시차 0ms · 화면 개인 정보 0건 · -14 LUFS. 실패하면 고치고 다시 렌더

## 도구 설치

### 1) 영상 편집 기본 도구
```bash
brew install ffmpeg tesseract tesseract-lang
pip install openai-whisper
```
- `ffmpeg`: 자르기·합치기·인코딩, `loudnorm`으로 LUFS 측정/보정
- `tesseract` + `tesseract-lang`: 화면 글자 읽기(개인 정보 검사)
- `openai-whisper`: 단어별 시각 받아쓰기

### 2) HTML로 영상을 만드는 HyperFrames (클로드 코드 플러그인, 공식 README 명령)
```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```
