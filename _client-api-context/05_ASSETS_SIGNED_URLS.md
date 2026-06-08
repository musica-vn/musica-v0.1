# Assets + Signed URLs (contract mức UI)

Repo hiện đang dùng Supabase Storage + signed URLs cho một số loại file (đặc biệt legal files ở compliance).
UI client (buyer/artist) sẽ cần contract tương tự cho:
- Thumbnail preview
- Audio playback (preview/original tuỳ policy)
- Certificate PDF download

## 1) Signed URL response shape (đề xuất)

```ts
type SignedUrlResponse = {
  url: string
  expiresInSeconds: number
}
```

Envelope:

```ts
ApiSuccessResponse<SignedUrlResponse>
```

## 2) Certificate download (buyer)

`GET /me/certificates/:certificateId/download`

- Auth: `BUYER`
- Response `data`:

```json
{
  "url": "https://<signed-url>",
  "expiresInSeconds": 21600
}
```

## 3) Product thumbnail (public)

`GET /products/:productId/thumbnail-url`

- Auth: public
- Response: `SignedUrlResponse`

## 4) Product playback (public hoặc require login)

`GET /products/:productId/playback-url`

- Auth: public (hoặc `BUYER`, tuỳ policy sau)
- Response: `SignedUrlResponse`

## 5) Upload flow (artist, optional)

Nếu artist được tự upload, dùng 3 bước chuẩn:

1) Request signed upload URL

`POST /me/products/:productId/original-upload-url`

Response `data`:

```json
{
  "uploadUrl": "https://<signed-put-url>",
  "fileKey": "123.mp3"
}
```

2) Client `PUT` file trực tiếp lên `uploadUrl` (Content-Type đúng)
3) Confirm upload

`POST /me/products/:productId/confirm-audio-upload`

Response `data`: `{ "ok": true }`
