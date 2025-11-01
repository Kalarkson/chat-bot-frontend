#!/bin/bash
echo "Устанавливаем Ollama..."
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "Ollama уже установлен"
fi

echo "Загружаем модель qwen2.5:14b..."
ollama pull qwen2.5:14b

echo "Создаём кастомную модель chat-bot..."

ollama create chat-bot -f Modelfile
echo "Кастомная модель chat-bot создана"