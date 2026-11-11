---
name: 영상편집
description: 영상 편집 작업 지침. 영상 자르기·합치기·자막(음성 인식)·화면 글자 인식(OCR)·HTML로 영상 만들기 등 영상편집을 요청받으면 이 지침을 먼저 따른다.
---

# 영상편집

## 1) 영상 편집 기본 도구

```bash
brew install ffmpeg tesseract tesseract-lang
pip install openai-whisper
```

- `ffmpeg`: 영상/오디오 자르기, 합치기, 변환, 인코딩
- `tesseract` + `tesseract-lang`: 영상 프레임 속 글자 인식(OCR, 한국어 포함)
- `openai-whisper`: 음성 → 텍스트(자막) 변환

## 2) HTML로 영상을 만드는 HyperFrames (클로드 코드 플러그인, 공식 README 명령)

```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```
