# Test MP3 Unified Key Design

## Goal

Đơn giản hóa luồng test audio của Tracks bằng cách cho toàn bộ bản ghi trong bảng `tracks`
dùng chung một storage key duy nhất là `test.mp3`.

## Buckets

Sử dụng các bucket hiện có:

- `original-audio`
- `preview-audio`
- `certificates` (không thay đổi, không tham gia luồng Tracks audio)

## Desired Behavior

- Mọi `original_audio_key` trong DB đều là `test.mp3`
- Mọi `preview_audio_key` trong DB đều là `test.mp3`
- Upload từ endpoint original sẽ ghi file vào object `test.mp3` trong bucket `original-audio`
- Upload từ endpoint preview sẽ ghi file vào object `test.mp3` trong bucket `preview-audio`
- Playback preview sẽ đọc key `test.mp3`
- Khi phát preview:
  - ưu tiên tìm object `test.mp3` trong bucket `preview-audio`
  - nếu không có thì fallback sang bucket `original-audio`

## Storage Semantics

- `test.mp3` là object nằm ở root của bucket
- Không dùng folder con như `audio/...` hoặc `tracks/...`
- File không được lưu local trong repo
- Browser upload trực tiếp lên Supabase Storage bằng signed upload URL do BE cấp

## Backend Changes

- `TracksService.createOriginalUploadUrl()` luôn tạo signed upload URL cho key `test.mp3`
- `TracksService.createPreviewUploadUrl()` luôn tạo signed upload URL cho key `test.mp3`
- Cả hai endpoint update DB của track hiện tại để:
  - `original_audio_key = 'test.mp3'`
  - `preview_audio_key = 'test.mp3'`
- `mapTrackRowToDto()` vẫn trả cả hai trường key là `test.mp3`
- `createPreviewPlaybackUrl()` đọc `test.mp3` từ DB và xin signed playback URL:
  - thử bucket `preview-audio` trước
  - fallback bucket `original-audio`

## Data Migration

- Seed data mới phải ghi `test.mp3` cho cả hai cột audio key
- Với dữ liệu đang có trên Supabase remote, chạy một câu lệnh update:

```sql
update public.products
set
  original_audio_key = 'test.mp3',
  preview_audio_key = 'test.mp3';
```

## FE Behavior

- FE không cần biết bucket name
- FE tiếp tục gọi BE lấy signed upload URL rồi `PUT` file mp3 trực tiếp vào URL đó
- Mọi track sau upload sẽ cùng tham chiếu tới object `test.mp3`
- UI detail/list vẫn hiển thị key từ DB, tức là `test.mp3`

## Risks

- Upload file mới từ bất kỳ track nào cũng ghi đè object `test.mp3`
- Mọi track sẽ phát cùng một audio file
- Đây chỉ phù hợp cho môi trường test/manual QA, không phù hợp production

## Verification

- Build API thành công
- Chạy SQL update để tất cả row đang có dùng `test.mp3`
- Gọi `original-upload-url` và xác nhận `fileKey = test.mp3`
- Gọi `preview-upload-url` và xác nhận `fileKey = test.mp3`
- Upload một file mp3 thật qua UI
- Gọi playback từ nhiều track khác nhau và xác nhận đều phát cùng 1 file
