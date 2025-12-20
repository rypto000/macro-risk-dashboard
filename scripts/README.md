# Macro Risk Monitoring Scripts

스마트 알림 시스템: 레짐 변경, 지표 임계값 돌파, 발산 감지

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env 파일 생성 (루트 디렉토리에)
cp ../.env.example ../.env

# .env 파일 수정하여 실제 값 입력
# TELEGRAM_BOT_TOKEN=your_actual_token
# TELEGRAM_CHAT_ID=your_actual_chat_id
```

### 2. 로컬 테스트

```bash
# 의존성 설치
pip install requests

# 모니터링 스크립트 실행
cd scripts
python monitor.py

# 주간 요약 실행
python weekly_summary.py
```

### 3. GitHub Actions 설정

Repository → Settings → Secrets and variables → Actions → New repository secret

필수 Secrets:
- `TELEGRAM_BOT_TOKEN`: Telegram 봇 토큰
- `TELEGRAM_CHAT_ID`: 단체방 Chat ID (음수)

선택 Secrets:
- `DASHBOARD_URL`: 대시보드 URL (기본값: https://macro-risk-dashboard.vercel.app)

## 📊 알림 시스템

### Tier 1: 레짐 변경 (즉시 알림)
- Risk-On ↔ Neutral ↔ Risk-Off ↔ Crisis
- 예시: "🚨 Neutral → Risk-Off 진입"

### Tier 2: 지표 임계값 돌파 (즉시 알림)
- T10Y2Y 금리 역전 (0% 이하)
- HY OAS 6% 돌파
- ISM PMI 50 미만 진입
- 실업률 4.5% 돌파

### 발산 감지 (즉시 알림)
- Macro Risk vs Fear & Greed 불일치
- 예시: "Risk-Off인데 Extreme Greed → 조정 경고"

### 주간 요약 (일요일 20:00 KST)
- 현재 레짐 및 Risk Score
- 모든 지표 현황
- Fear & Greed 지수
- 권장 액션

## 🔧 자동화 스케줄

- **모니터링**: 6시간마다 (00:00, 06:00, 12:00, 18:00 UTC)
- **주간 요약**: 매주 일요일 20:00 KST (11:00 UTC)

## 🛡️ 보안

- ⚠️ **절대 `.env` 파일을 커밋하지 마세요**
- ⚠️ **토큰/Chat ID를 코드에 하드코딩하지 마세요**
- ✅ GitHub Secrets 사용
- ✅ `.gitignore`에 `.env`, `state.json` 포함됨

## 📁 파일 설명

- `monitor.py`: 메인 모니터링 스크립트 (Tier 1, 2, 발산 감지)
- `weekly_summary.py`: 주간 요약 생성
- `state.json`: 이전 상태 저장 (자동 생성, Git 제외)

## 🧪 수동 실행

```bash
# GitHub Actions 수동 트리거
# Repository → Actions → Macro Risk Monitor → Run workflow
```

## 📞 Telegram 봇 설정

1. @BotFather에서 봇 생성
2. 봇 토큰 복사
3. 단체방에 봇 추가
4. @getidsbot로 Chat ID 확인
5. GitHub Secrets에 등록
