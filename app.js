const sb = window.supabase.createClient(
  "https://zfdbptikvcyhrqtqdkxj.supabase.co",
  "sb_publishable_Jr7ICxOpjLZP78Ogwuwrcg_OBRE5eeG"
);

let currentUser = null;

// ===== 读取聊天记录 =====
let chatHistory = loadChat();

// ===== 登录检查 =====
async function checkLogin() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  // 恢复历史消息
  renderHistory();
}

checkLogin();

// ===== logout =====
async function logout() {
  await sb.auth.signOut();
  window.location.href = "index.html";
}

// ===== Enter发送 =====
function handleKey(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
}

// ===== Base64 =====
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== 添加消息 =====
function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "ai");
  div.innerText = text;

  document.getElementById("messages").appendChild(div);
  scrollToBottom();
}

// ===== 滚动 =====
function scrollToBottom() {
  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
}

// ===== 保存 =====
function saveChat() {

  // 只保留最近20轮（40条消息）
  if (chatHistory.length > 40) {
    chatHistory = chatHistory.slice(chatHistory.length - 40);
  }

  localStorage.setItem(
    "myai_chat",
    JSON.stringify(chatHistory)
  );
}

// ===== 读取 =====
function loadChat() {
  const data = localStorage.getItem("myai_chat");
  return data ? JSON.parse(data) : [];
}

// ===== 渲染历史 =====
function renderHistory() {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  chatHistory.forEach(msg => {
    addMessage(msg.role, msg.text);
  });
}

// ===== New Chat =====
function newChat() {
  chatHistory = [];
  localStorage.removeItem("myai_chat");

  document.getElementById("messages").innerHTML = "";
}

// ===== 发送 =====
async function send() {

  const input = document.getElementById("input");
  const fileInput = document.getElementById("imageInput");
  const model = document.getElementById("modelSelect").value;

  const text = input.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) return;

  input.value = "";

  let image = null;

  if (file) {
    image = await toBase64(file);
  }

  // user message
  addMessage("user", text || "[Image]");

  chatHistory.push({
    role: "user",
    text: text || "[Image]"
  });

  saveChat();

  // AI loading
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.innerText = "Thinking...";
  document.getElementById("messages").appendChild(loadingDiv);

  scrollToBottom();

  try {

    const res = await fetch("https://api.hippo1996.top", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        image: image,
        model: model,
        user_id: currentUser?.id,
        context: chatHistory.slice(-20)
      })
    });

    const data = await res.json();

    const reply = data?.reply || "No response";

    loadingDiv.innerText = reply;

    chatHistory.push({
      role: "ai",
      text: reply
    });

    saveChat();

  } catch (err) {
    loadingDiv.innerText = "Error: " + err.message;
  }

  fileInput.value = "";
}