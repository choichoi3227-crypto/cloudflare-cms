// workers/platform-api/src/go/models/types.go
package models

import "encoding/json"

// D1Command는 JS Glue 계층에 DB 쿼리를 요청할 때 사용하는 구조체입니다.
// Go에는 D1 네이티브 바인딩이 없으므로, 이 구조체를 JSON으로 반환하면
// JS가 이를 파싱하여 D1에 쿼리를 실행하고 결과를 다시 Go로 보냅니다.
type D1Command struct {
    Action string        `json:"action"`
    SQL    string        `json:"sql"`
    Params []interface{} `json:"params"`
}

type D1Result struct {
    Action string          `json:"action"`
    Data   json.RawMessage `json:"data"`
}

// API 요청/응답 표준 구조체
type ApiResponse struct {
    Success bool            `json:"success"`
    Data    json.RawMessage `json:"data,omitempty"`
    Error   *ApiError       `json:"error,omitempty"`
}

type ApiError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

func SuccessResponse(data interface{}) []byte {
    b, _ := json.Marshal(data)
    return MustMarshal(ApiResponse{Success: true, Data: b})
}

func ErrorResponse(code, message string, status int) []byte {
    return MustMarshal(ApiResponse{Success: false, Error: &ApiError{Code: code, Message: message}})
}

func MustMarshal(v interface{}) []byte {
    b, err := json.Marshal(v)
    if err != nil {
        return []byte(`{"success":false,"error":{"code":"INTERNAL","message":"json marshal error"}}`)
    }
    return b
}

// 도메인 모델
type SiteCreateRequest struct {
    SiteName string `json:"site_name"`
    Domain   string `json:"domain"`
}

type OAuthCallbackRequest struct {
    CfAccountId string  `json:"cfAccountId"`
    Email       string  `json:"email"`
    Username    string  `json:"username"`
    AvatarUrl   *string `json:"avatarUrl"`
    OAuthToken  string  `json:"oauthToken"`
    RefreshToken *string `json:"refreshToken"`
    ExpiresAt   *int64  `json:"expiresAt"`
}
