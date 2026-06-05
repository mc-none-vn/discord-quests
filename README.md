# 🎯 Discord Quest Tracker

Tự động theo dõi Discord Quests mỗi 5 phút và gửi thông báo webhook **chỉ khi có quest mới**.

## ⚠️ Disclaimer
Công cụ được thiết kế cho việc sử dụng cá nhân bởi bạn và dự án này sử dụng token discord của bạn để hoạt động vì thế chúng tôi sẽ không chịu bất kỳ trách nghiệm nào nếu bạn sử dụng nó và bị ban hay bị hạn chế tài khoản, bạn chịu hoàn toàn trách nghiệm với việc bạn làm.

## 📂 Project Structure

<!-- START_METADATA_DISCORD_QUEST_TREE -->
```
discord-quest/
├── .github/                                ← GitHub Actions config
│   └── workflows/
│       ├── tracker.yml
│       └── update-structure.yml
├── assets/                                 ← Assets của hệ thống
│   ├── discord_quests.webp
│   ├── discord.webp
│   ├── empty.png
│   └── quests.webp
├── src/                                    ← Mã nguồn chính
│   ├── generate-readme.js
│   ├── language.json                       ← File cấu hình ngôn ngữ
│   ├── main.js                             ← Script chạy chính
│   └── readme_map.json
├── Không Có Tiêu Đề27_20260606062325.png
├── package.json
├── README.md
└── state.json                              ← Lưu trạng thái (Atomic write)
```
<!-- END_METADATA_DISCORD_QUEST_TREE -->

## 🛠️ Installation & Setup

### 1. Fork và thêm Cấu hình vào repo
> Vào **Settings → Secrets and variables → Actions**

##### Tại tab Secrets (Nhấn nút "New repository secret"):

| Secret | Mô tả |
|--------|-------|
| `DISCORD_TOKEN` | User token Discord của bạn |
| `MAIN_WEBHOOK` | URL webhook kênh thông báo chính |
| `ERROR_WEBHOOK` | URL webhook kênh báo lỗi (có thể để trống) |

##### Tại tab Variables (Nhấn nút "New repository variable"):

| Variable | Mô tả | Giá trị gợi ý |
|----------|-------|---------------|
| `LOCALE` | Ngôn ngữ hiển thị tiêu đề/nội dung của Quest | `vi`, `en-US`, `ja`, `zh-CN` |
| `PING_ROLE_ID` | ID role Discord muốn tag kèm khi có thông báo | Điền ID Role (Có thể để trống) |

### 2. Bật GitHub Actions
> Vào tab **Actions** → bật nếu bị tắt → chạy thủ công lần đầu để test.

## ⚙️ How It Works?

```
Mỗi 5 phút
    ↓
Fetch /quests/@me từ Discord API
    ↓
So sánh với state.json
    ↓
Có quest mới? → Gửi embed bằng webhook
              → Ping role (nếu có)
              → Lưu ID vào state.json (atomic)
Không có mới? → Kết thúc yên lặng
    ↓
Commit state.json lên repo
```

## 📦 File state.json

Tệp này do bot tự quản lý. Bạn có thể:
- **Xem**: mở trực tiếp trên GitHub
- **Reset**: xóa hết `sent_ids` và `last_seen` → bot sẽ gửi lại tất cả quest hiện tại
- **Xóa 1 quest cụ thể**: xóa ID khỏi `sent_ids` → bot sẽ gửi lại quest đó

**Cơ chế an toàn:** script ghi vào `state.tmp.json` trước, sau đó rename sang `state.json`.  
Nếu lỗi giữa chừng → `state.json` cũ vẫn còn nguyên, không mất dữ liệu.

## 🤝 Acknowledgements
Cảm ơn dự án và tài liệu sau đã giúp hoàn thành dự án này:
- [cc-plugins](https://github.com/BachLe2000/cc-plugins/tree/master)
