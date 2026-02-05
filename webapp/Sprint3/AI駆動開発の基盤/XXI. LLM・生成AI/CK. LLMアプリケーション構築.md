# CK. LLM アプリケーション構築

## 概要

LLM を活用したアプリケーションでは、テキストに加えて音声入力・出力を統合することで、より自然で使いやすいインターフェースを実現します。Speech-to-Text（STT）と Text-to-Speech（TTS）の実装フロー、主要 API、実装技術を習得し、マルチモーダルな AI 応用を構築します。

---

## 1. Speech-to-Text（STT）の概念

**役割:** 音声を文字に変換

```
User: 「明日の天気は？」(音声) → STT API → 「明日の天気は？」(テキスト)
```

実装フロー：
1. マイク入力 → 音声データ取得
2. STT API に送信 → テキスト取得
3. LLM に送信 → 応答生成

---

## 2. Text-to-Speech（TTS）の概念

**役割:** テキストを音声に変換

```
LLM: 「明日は晴れです」(テキスト) → TTS API → 🔊 音声再生
```

---

## 3. 主要な STT/TTS API

| API | 企業 | 言語数 | 特徴 |
|---|---|---|---|
| **Google Speech-to-Text** | Google | 125+ | 高精度 |
| **Azure Speech Services** | Microsoft | 100+ | 自然な声 |
| **AWS Transcribe** | AWS | 33+ | 電話向け |
| **OpenAI Whisper** | OpenAI | 99+ | 多言語、local対応 |
| **Web Speech API** | W3C | ブラウザ依存 | クライアント処理 |

**選択基準：** 精度 → Google、多言語 → Whisper、オフライン → Whisper local

---

## 4. 音声入力の実装フロー

```
1. マイク許可取得
   ↓
2. MediaRecorder で録音
   ↓
3. 音声ファイル化（Blob）
   ↓
4. STT API 送信
```

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
recorder.start();
// ... 後で停止
```

---

## 5. Speech-to-Text 実装

```typescript
// OpenAI Whisper API
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: formData
    }
  );

  const data = await response.json();
  return data.text;
}
```

---

## 6. Text-to-Speech 実装

```typescript
// Azure TTS
async function textToSpeech(text: string, lang: string = 'ja-JP'): Promise<void> {
  const response = await fetch('...azure-tts-api...', {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': API_KEY,
      'Content-Type': 'application/ssml+xml'
    },
    body: `<speak version='1.0' xml:lang='${lang}'>
      <voice name='ja-JP-NanamilNeural'>${text}</voice>
    </speak>`
  });

  const audioBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  const audio = await audioContext.decodeAudioData(audioBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audio;
  source.connect(audioContext.destination);
  source.start(0);
}
```

---

## 7. 音声での完全な対話フロー

```
1. ユーザーが話す → マイク入力
   ↓
2. STT → テキスト化
   ↓
3. LLM に送信 → 応答生成
   ↓
4. TTS → 音声化
   ↓
5. スピーカー再生
```

```typescript
async function voiceConversation() {
  const audioBlob = await recordAudio();
  const userText = await transcribeWithWhisper(audioBlob);

  const response = await fetch('...llm-api...', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: userText }] })
  });

  const data = await response.json();
  const assistantText = data.choices[0].message.content;

  await textToSpeech(assistantText);
  console.log('アシスタント:', assistantText);
}
```

---

## 8. 言語・声質・速度調整

**言語選択:**
```typescript
formData.append('language', 'ja');  // 日本語
```

**声質（Azure）:**
```xml
<voice name='ja-JP-NanamilNeural'>  ← 女性の自然な声
```

**速度:**
```typescript
source.playbackRate = 1.5;  // 1.5倍速
```

---

## 9. 実装チェックリスト

- マイク入力許可と Recording
- STT API で文字化
- LLM API 連携
- TTS で音声化
- Web Audio API 再生
- エラーハンドリング（権限拒否、タイムアウト等）
- 言語/声質設定

