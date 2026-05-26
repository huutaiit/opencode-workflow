# Flutter AI Chat Integration Specialist
# Flutter AIチャット統合スペシャリスト
# Chuyen Gia Tich Hop AI Chat Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data, Presentation |
| **Directory Pattern** | `lib/features/{feature}/data/datasources/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `ai_chat_datasource.dart`, `chat_message_widget.dart`. Classes: `AiChatDataSource`, `ChatMessageWidget` |
| **Imports From** | Data (API client for AI endpoint), Presentation (chat UI widgets) |
| **Cannot Import** | Domain (AI integration is infrastructure) |
| **Pattern Numbers** | 115.1–115.5 |
| **Source Paths** | `lib/features/*/data/datasources/*_ai*.dart`, `lib/features/*/presentation/widgets/*_chat*.dart` |
| **File Count** | 2-3 AI chat files |
| **Imported By** | Presentation (chat screens), Data (AI-powered features) |
| **Dependencies** | dio ^5.4.0 (for API calls), dart_openai ^5.1.0 (optional) |
| **When To Use** | AI-powered chat assistant, streaming text responses, conversation history, prompt templates |
| **Source Skeleton** | `lib/features/ai_chat/data/datasources/ai_chat_datasource.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate AI chat integration with streaming responses, conversation management, chat UI widgets, prompt templates, and token usage tracking |
| **Activation Trigger** | files: lib/features/*/data/datasources/*_ai*.dart; keywords: aiChat, llm, streaming, chatCompletion, anthropic, openai, gemini |

---

## Patterns

### Pattern 115.1: Streaming Chat API

```dart
/// Server-Sent Events (SSE) streaming for AI responses
class AiChatDataSource {
  final Dio _dio;

  AiChatDataSource(this._dio);

  /// Stream AI response token by token
  Stream<String> streamChat({
    required List<ChatMessage> messages,
    String model = 'claude-sonnet-4-20250514',
    double temperature = 0.7,
    int maxTokens = 1024,
  }) async* {
    final response = await _dio.post(
      '/ai/chat/completions',
      data: {
        'model': model,
        'messages': messages.map((m) => m.toJson()).toList(),
        'temperature': temperature,
        'max_tokens': maxTokens,
        'stream': true,
      },
      options: Options(responseType: ResponseType.stream),
    );

    final stream = response.data.stream as Stream<List<int>>;
    String buffer = '';

    await for (final chunk in stream) {
      buffer += utf8.decode(chunk);
      final lines = buffer.split('\n');
      buffer = lines.removeLast(); // Keep incomplete line

      for (final line in lines) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();
          if (data == '[DONE]') return;
          try {
            final json = jsonDecode(data);
            final content = json['choices']?[0]?['delta']?['content'];
            if (content != null) yield content;
          } catch (_) {}
        }
      }
    }
  }
}

class ChatMessage {
  final String role; // 'user', 'assistant', 'system'
  final String content;

  ChatMessage({required this.role, required this.content});

  Map<String, String> toJson() => {'role': role, 'content': content};
}
```

### Pattern 115.2: Chat UI Widget

```dart
class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isStreaming;

  const ChatBubble({super.key, required this.message, this.isStreaming = false});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isUser
              ? Theme.of(context).colorScheme.primaryContainer
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message.content),
            if (isStreaming) ...[
              const SizedBox(height: 4),
              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ],
        ),
      ),
    );
  }
}
```

### Pattern 115.3: Conversation Manager

```dart
class ConversationManager {
  final List<ChatMessage> _messages = [];
  final String? systemPrompt;

  ConversationManager({this.systemPrompt});

  List<ChatMessage> get messages => List.unmodifiable(_messages);

  List<ChatMessage> get apiMessages => [
    if (systemPrompt != null)
      ChatMessage(role: 'system', content: systemPrompt!),
    ..._messages,
  ];

  void addUserMessage(String content) {
    _messages.add(ChatMessage(role: 'user', content: content));
  }

  void addAssistantMessage(String content) {
    _messages.add(ChatMessage(role: 'assistant', content: content));
  }

  void clear() => _messages.clear();

  /// Trim to last N messages (context window management)
  void trimHistory({int maxMessages = 20}) {
    if (_messages.length > maxMessages) {
      _messages.removeRange(0, _messages.length - maxMessages);
    }
  }
}
```

### Pattern 115.4: Prompt Templates

```dart
class PromptTemplates {
  static String summarize(String text) =>
      'Summarize the following text concisely:\n\n$text';

  static String translate(String text, String targetLang) =>
      'Translate the following to $targetLang:\n\n$text';

  static String codeExplain(String code) =>
      'Explain this code in simple terms:\n\n```\n$code\n```';
}
```

### Pattern 115.5: Token Usage Tracking

```dart
class TokenUsageTracker {
  int _totalInputTokens = 0;
  int _totalOutputTokens = 0;

  void track({required int inputTokens, required int outputTokens}) {
    _totalInputTokens += inputTokens;
    _totalOutputTokens += outputTokens;
  }

  int get totalTokens => _totalInputTokens + _totalOutputTokens;
  double get estimatedCostUsd => (totalTokens / 1000) * 0.003; // Approximate

  void reset() {
    _totalInputTokens = 0;
    _totalOutputTokens = 0;
  }
}
```

---

## MUST DO

- Use streaming (SSE) for AI responses (better UX — show tokens as they arrive)
- Manage conversation history (trim to prevent token overflow)
- Show typing/streaming indicator during AI response
- Handle API errors gracefully (rate limits, timeout, model unavailable)
- Proxy AI API calls through backend (never expose API keys to client)

## MUST NOT DO

- Call AI APIs directly from client (API key exposure)
- Send unlimited conversation history (token costs + limits)
- Block UI while waiting for full response (use streaming)
- Store sensitive user data in conversation history
- Hardcode AI model names (use config for easy switching)

---

## References

- [Anthropic API Streaming](https://docs.anthropic.com/en/api/streaming)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
