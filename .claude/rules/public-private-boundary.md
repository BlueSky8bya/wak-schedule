# 공개 경계

- `app/(public)`(루트 `/`)와 `app/api/public/*`는 `lib/schedules/public-loader`만 import한다.
- 이들은 `studio-loader`, 스튜디오 DTO를 응답 타입으로, Supabase service-role 헬퍼를 쓰지 않는다.
- 공개 응답에는 발행 전(draft) 일정과 아직 시각이 안 된 최초공개(떡밥)의 제목·태그가 실리면 안 된다.
- 스튜디오 데이터에서 공개 데이터로 넘어갈 때는 객체 spread 대신 필드를 명시해 DTO를 조립한다.
