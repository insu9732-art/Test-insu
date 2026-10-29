---
description: 앱 기획 후 승인 시 React Native(Expo) 프로젝트 세팅 및 Expo Go QR 테스트 환경 구축
argument-hint: [앱 아이디어 또는 요구사항]
---

# /make-app 작업 매뉴얼

입력: $ARGUMENTS

## 1단계: 기획 → `app_plan.md` (컨펌 필수)
앱의 핵심 기능과 화면 흐름도를 `app_plan.md`로 작성하고, 사용자 승인을 받기 전에는 프로젝트를 생성하지 않는다.
- 앱 목적과 타깃 사용자
- 핵심 기능 목록
- 화면 목록과 화면 흐름도(텍스트 다이어그램 또는 Mermaid)

## 2단계: 개발 (승인 후)
- 설치할 패키지와 작업 계획을 먼저 브리핑한다.
- React Native (Expo) 기반으로 프로젝트를 세팅한다(안드로이드/iOS 동시 지원).
- `npx expo start`로 개발 서버를 실행해, 스마트폰의 Expo Go 앱에서 QR코드를 찍어 바로 테스트할 수 있도록 한다.
- 같은 네트워크가 아니거나 원격 환경이면 `--tunnel` 옵션으로 실행한다.
