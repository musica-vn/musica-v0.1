# Debug Session: track-admin-runtime
- **Status**: [OPEN]
- **Issue**: Upload mp3, search, sort, create/edit track va details popup dang hoat dong khong on dinh.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-track-admin-runtime.ndjson

## Reproduction Steps
1. Chay FE va BE local.
2. Login bang tai khoan admin.
3. Vao trang `Tracks`.
4. Thu search, sort, upload preview/original va create/edit track.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | FE khong goi lai list API dung query khi filter/sort thay doi | High | Low | Pending |
| B | Signed upload flow dang dung sai method/body nen upload mp3 that bai | High | Med | Pending |
| C | Preview playback URL/lifecycle cua waveform khong on dinh | Med | Med | Pending |
| D | Form create/edit sai schema nghiep vu (`usage_rights`, `duration`, files`) | High | Med | Pending |
| E | State UI cua details / upload / edit dang tranh chap nhau | Med | Med | Pending |

## Log Evidence
Pending

## Verification Conclusion
Pending
