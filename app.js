const sb = window.supabase.createClient(
  "https://zfdbptikvcyhrqtqdkxj.supabase.co",
  "sb_publishable_Jr7ICxOpjLZP78Ogwuwrcg_OBRE5eeG"
);

let msgCounter = 0;
let currentUser = null;

// ===== 登录检查 =====
async function checkLogin() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
}

// 自动执行
checkLogin();

// ===== 登出 =====
async function logout() {
  await sb.auth.signOut();
  window.location.href = "index.html";
}

// ===== 回车发送 =====
function handleKey(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
}

// ===== Base64图片转换 =====
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
  const id = "msg_" + (++msgCounter);

  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "ai");
  div.id = id;

  div.innerText = text;

  document.getElementById("messages").appendChild(div);

  scrollToBottom();

  return id;
}

// ===== 更新消息 =====
function updateMessage(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

// ===== 滚动到底部 =====
function scrollToBottom() {
  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
}

// ===== 发送消息（核心） =====
async function send() {

  const input = document.getElementById("input");
  const fileInput = document.getElementById("imageInput");
  const model = document.getElementById("modelSelect").value;

  const text = input.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) return;

  input.value = "";

  let image = null;

  // ===== 图片处理 =====
  if (file) {
    image = await toBase64(file);
  }

  // 显示用户消息
  addMessage("user", text || "[Image]");

  // AI loading
  const loadingId = addMessage("ai", "Thinking...");

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
        user_id: currentUser?.id
      })
    });

    const data = await res.json();

    const reply = data?.reply || "No response";

    updateMessage(loadingId, reply);

  } catch (err) {
    updateMessage(loadingId, "Error: " + err.message);
  }

  // 清空图片
  fileInput.value = "";
}