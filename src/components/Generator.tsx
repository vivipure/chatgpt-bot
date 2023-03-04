import { createSignal, For, Show } from "solid-js";
import MessageItem from "./MessageItem";
import IconClear from "./icons/Clear";
import type { ChatMessage } from "../types";

export default () => {
  let inputRef: HTMLInputElement;
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    createSignal("");
  const [loading, setLoading] = createSignal(false);

  const [isError, setIsError] = createSignal(false);
  let cachePrompt = "";

  async function getMessage() {
    setLoading(true);
    const response = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        messages: messageList(),
      }),
    });
    if (!response.ok || !response.body) {
      setCurrentAssistantMessage("");
      setLoading(false);
      setIsError(true);
      return;
    }
    const data = response.body;

    await printMessageContent();
    setMessageList([
      ...messageList(),
      {
        role: "assistant",
        content: currentAssistantMessage(),
      },
    ]);
    setCurrentAssistantMessage("");
    setLoading(false);

    async function printMessageContent() {
      const reader = data.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          let char = decoder.decode(value);
          if (char === "\n" && currentAssistantMessage().endsWith("\n")) {
            continue;
          }
          if (char) {
            setCurrentAssistantMessage(currentAssistantMessage() + char);
          }
        }
        done = readerDone;
      }
    }
  }

  const handleButtonClick = async () => {
    const inputValue = inputRef.value;
    if (!inputValue) {
      return;
    }
    cachePrompt = inputValue;
    inputRef.value = "";
    setIsError(false);
    setMessageList([
      ...messageList(),
      {
        role: "user",
        content: inputValue,
      },
    ]);
    getMessage();
  };

  const clear = () => {
    inputRef.value = "";
    setMessageList([]);
    setCurrentAssistantMessage("");
  };
  const retry = () => {
    setIsError(false);
    getMessage();
  };

  return (
    <div my-6>
      <For each={messageList()}>
        {(message) => (
          <MessageItem role={message.role} message={message.content} />
        )}
      </For>
      {currentAssistantMessage() && (
        <MessageItem role="assistant" message={currentAssistantMessage} />
      )}
      {isError() && <ErrorBox onClick={retry} />}
      <Show
        when={!loading()}
        fallback={() => (
          <div class="h-12 my-4 flex items-center justify-center bg-slate bg-op-15 text-slate rounded-sm">
            AI is thinking...
          </div>
        )}
      >
        <div class="my-4 flex items-center gap-2">
          <input
            ref={inputRef!}
            type="text"
            id="input"
            placeholder="Enter something..."
            autocomplete="off"
            autofocus
            disabled={loading()}
            onKeyDown={(e) => {
              e.key === "Enter" && !e.isComposing && handleButtonClick();
            }}
            w-full
            px-4
            h-12
            text-slate
            rounded-sm
            bg-slate
            bg-op-15
            focus:bg-op-20
            focus:ring-0
            focus:outline-none
            placeholder:text-slate-400
            placeholder:op-30
          />
          <button
            onClick={handleButtonClick}
            disabled={loading()}
            h-12
            px-4
            py-2
            bg-slate
            bg-op-15
            hover:bg-op-20
            text-slate
            rounded-sm
          >
            Send
          </button>
          <button
            title="Clear"
            onClick={clear}
            disabled={loading()}
            h-12
            px-4
            py-2
            bg-slate
            bg-op-15
            hover:bg-op-20
            text-slate
            rounded-sm
          >
            <IconClear />
          </button>
        </div>
      </Show>
    </div>
  );
};
function ErrorBox({ onClick }: { onClick: () => any }) {
  return (
    <div class="p-4 border-red border-1 flex justify-between items-center">
      <span color-red mr-2>
        Request Error
      </span>
      <button
        onClick={onClick}
        h-12
        px-4
        py-2
        bg-slate
        bg-op-15
        hover:bg-op-20
        text-slate
        rounded-sm
      >
        Regenrated
      </button>
    </div>
  );
}
