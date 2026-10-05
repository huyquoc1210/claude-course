# Claude Code Cheat Sheet

## CLI Commands & Flags

| Lệnh                                    | Ý nghĩa                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `claude` / `claude "my prompt"`         | Bắt đầu một session mới, có thể kèm một prompt ban đầu.                  |
| `claude -p "my prompt"`                 | Gửi query với "my prompt" rồi thoát luôn, không giữ lại session.         |
| `claude -c`                             | Tiếp tục session gần nhất.                                               |
| `claude --agent DocsExplorer`           | Bắt đầu session với một custom agent.                                    |
| `claude --allowedTools "Read" "Write"`  | Bỏ qua bước xác nhận permission cho các tool được chỉ định.              |
| `claude --disallowedTools "Write"`      | Loại bỏ một số tool khỏi context, Claude sẽ không dùng được các tool đó. |
| `claude --dangerously-skip-permissions` | Bỏ qua **TẤT CẢ** các bước xác nhận permission. Hãy dùng thận trọng!     |
| `claude --append-system-prompt "..."`   | Thêm instruction vào cuối system prompt mặc định.                        |
| `claude --model opus`                   | Đặt model mặc định cho session hiện tại.                                 |
| `claude --permission-mode plan`         | Khởi động ở plan mode.                                                   |
| `claude --remote "Add dark mode"`       | Bắt đầu một remote session (chạy trên web).                              |
| `claude --system-prompt "..."`          | Thay thế toàn bộ system prompt mặc định.                                 |

## Các lệnh quan trọng (Crucial Commands)

| Lệnh           | Ý nghĩa                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `/help`        | Liệt kê các command có sẵn và xem hướng dẫn sử dụng.                     |
| `/model`       | Chọn model sẽ dùng cho session hiện tại.                                 |
| `/clear`       | Xóa context window của session.                                          |
| `/compact`     | Nén lịch sử context của session hiện tại để giải phóng context window.   |
| `/config`      | Mở menu settings dạng tương tác.                                         |
| `/context`     | Xem thống kê về context window hiện tại và mức sử dụng.                  |
| `/usage`       | Xem mức usage hiện tại của plan đang dùng.                               |
| `/init`        | Phân tích project và tạo file `CLAUDE.md` ban đầu.                       |
| `/mcp`         | Xem và quản lý các MCP server đã cài đặt.                                |
| `/permissions` | Xem và cập nhật permission.                                              |
| `/rewind`      | Rewind (undo) về một thời điểm trước đó, tương đương nhấn `ESC` + `ESC`. |
| `/statusline`  | Cấu hình status line của Claude Code.                                    |
| `/teleport`    | Tiếp tục (resume) một remote session của Claude Code.                    |

## Tương tác với Claude Code (Claude Code Interaction)

| Phím tắt                                        | Ý nghĩa                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `SHIFT + ENTER` / `OPTION + ENTER` / `CTRL + J` | Xuống dòng mới.                                          |
| `SHIFT + TAB`                                   | Chuyển qua lại giữa các mode.                            |
| `CTRL + C`                                      | Hủy input hiện tại hoặc dừng quá trình generation.       |
| `ESC + ESC`                                     | Khôi phục code về trạng thái trước action gần nhất.      |
| `OPTION + P` / `ALT + P`                        | Chuyển model.                                            |
| Các phím mũi tên (`ARROW keys`)                 | Duyệt qua các option, câu hỏi hoặc các message trước đó. |
| `CTRL + O`                                      | Bật/tắt verbose output.                                  |
| `CTRL + B`                                      | Chuyển task sang chạy background.                        |
| `CTRL + V` / `CMD + V` / `ALT + V`              | Chèn text hoặc hình ảnh.                                 |

## Settings

| Cấu hình                            | Ý nghĩa                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `{ "permissions": {...} }`          | Quản lý permission áp dụng cho mọi session.            |
| `{ "model": "opus" }`               | Đặt AI model mặc định cho các session mới.             |
| `{ "alwaysThinkingEnabled": true }` | Bật/tắt chế độ "advanced thinking".                    |
| `{ "hooks": {} }`                   | Quản lý hooks.                                         |
| `{ "env": { "IS_DEMO": 1 } }`       | Các environment variable được áp dụng cho mọi session. |
