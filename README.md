# 🎯 Discord Quest Tracker

Tự động theo dõi Discord Quests mỗi 5 phút và gửi thông báo webhook **chỉ khi có quest mới**.

## Cấu trúc

```
discord-quest/
├── .github/
│   └── workflows/
│       └── tracker.yml      ← GitHub Actions (tự chạy mỗi 5 phút)
├── assets/                  ← Assets của hệ thống
│   ├── discord.webp
│   ├── discord_quests.webp
│   ├── orbs.png
│   └── quests.webp
├── src/
│   └── main.js              ← Script chính
├── README.md
└── state.json               ← Lưu trạng thái (tự quản lý, atomic write)
```

## Cài đặt

### 1. Fork và thêm Secrets vào repo

Vào **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Mô tả |
|--------|-------|
| `DISCORD_TOKEN` | User token Discord của bạn |
| `MAIN_WEBHOOK` | URL webhook kênh thông báo chính |
| `ERROR_WEBHOOK` | URL webhook kênh báo lỗi (có thể để trống) |
| `PING_ROLE_ID` | ID role muốn ping (có thể để trống) |

### 2. Bật GitHub Actions

Vào tab **Actions** → bật nếu bị tắt → chạy thủ công lần đầu để test.

## Cách hoạt động

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

## File state.json

Tệp này do bot tự quản lý. Bạn có thể:
- **Xem**: mở trực tiếp trên GitHub
- **Reset**: xóa hết `sent_ids` và `last_seen` → bot sẽ gửi lại tất cả quest hiện tại
- **Xóa 1 quest cụ thể**: xóa ID khỏi `sent_ids` → bot sẽ gửi lại quest đó

**Cơ chế an toàn:** script ghi vào `state.tmp.json` trước, sau đó rename sang `state.json`.  
Nếu lỗi giữa chừng → `state.json` cũ vẫn còn nguyên, không mất dữ liệu.

## Acknowledgements
Cảm ơn dự án và tài liệu sau đã giúp hoàn thành dự án này:
- [cc-plugins]([https://github.com/username/repo-a](https://github.com/BachLe2000/cc-plugins/tree/master])
