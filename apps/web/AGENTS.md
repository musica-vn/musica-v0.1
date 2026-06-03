# Web Skills Handbook

> Runtime note: file hướng dẫn chính cho AI agent khi làm FE là [AGENT.md](./AGENT.md). Tài liệu này chỉ dùng khi bảo trì `apps/web/skills`.

## Mục đích
- Giữ `apps/web/skills` gọn, đúng use-case và dễ tra cứu.
- Tránh nhét quá nhiều hướng dẫn dài vào runtime prompt của FE.
- Chỉ thêm guidance mới khi nó thực sự thay đổi hành vi của agent.

## Khi nào đọc file này
- Khi tạo mới hoặc chỉnh sửa skill trong `apps/web/skills`.
- Khi cần rà lại taxonomy giữa các skill Vue/Router/Pinia/Debug/Testing.
- Không cần đọc file này cho các task FE thông thường.

## Skill Matrix
| Nhu cầu | Skill nên đọc |
|---|---|
| Build/refactor Vue SFC | `vue-best-practices` |
| Router, guards, route params | `vue-router-best-practices` |
| Pinia stores | `vue-pinia-best-practices` |
| Debug runtime/warning | `vue-debug-guides` |
| Test component/composable | `vue-testing-best-practices` |
| Thiết kế composable tái sử dụng | `create-adaptable-composable` |
| Options API | `vue-options-api-best-practices` |
| JSX trong Vue | `vue-jsx-best-practices` |

## Nguyên tắc viết skill
- `SKILL.md` phải nói rõ skill dùng khi nào và không dùng khi nào.
- Mở đầu ngắn gọn; chi tiết dài đưa xuống `reference/`.
- Không lặp lại kiến thức Vue cơ bản mà model nào cũng biết.
- Chỉ giữ ví dụ thật sự giúp agent tránh sai pattern.
- Dùng relative paths; không dùng Windows absolute paths.

## Checklist bảo trì
- Giữ tên gọi nhất quán giữa các skill và references.
- Xoá hoặc gộp các guideline bị trùng giữa nhiều skill.
- Nhóm references theo nhu cầu thực tế: component, router, state, debug, testing.
- Ghi rõ dependency nào chỉ là ví dụ/reference, dependency nào là runtime dependency của app.
- Sau thay đổi đáng kể, chạy `pnpm --filter web typecheck`.

## Cách tổ chức khuyến nghị
- `AGENT.md`: runtime entrypoint ngắn cho công việc FE hằng ngày.
- `AGENTS.md`: handbook bảo trì skill library.
- `apps/web/skills/<skill>/SKILL.md`: overview ngắn, định hướng chọn đúng reference.
- `apps/web/skills/<skill>/reference/*`: chi tiết chuyên sâu, chỉ mở khi task cần.
