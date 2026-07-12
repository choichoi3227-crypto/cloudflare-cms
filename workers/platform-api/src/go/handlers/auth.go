// workers/platform-api/src/go/handlers/auth.go
package handlers

import (
    "cloudpress-platform-api/models"
    "encoding/json"
)

func HandleAuthCallback(reqBody []byte, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    var req models.OAuthCallbackRequest
    if err := json.Unmarshal(reqBody, &req); err != nil {
        return models.ErrorResponse("VALIDATION_ERROR", "잘못된 요청 형식입니다.", 400)
    }

    // 1. 기존 Cloudflare 계정 조회
    cfAccountData := executeDB("SELECT id, user_id FROM user_cloudflare_accounts WHERE cloudflare_account_id = ?", req.CfAccountId)
    var cfAccount struct {
        ID     string `json:"id"`
        UserID string `json:"user_id"`
    }
    if err := json.Unmarshal(cfAccountData, &cfAccount); err == nil && cfAccount.ID != "" {
        // 토큰 업데이트
        executeDB("UPDATE user_cloudflare_accounts SET oauth_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?", req.OAuthToken, req.RefreshToken, req.ExpiresAt, cfAccount.ID)
        
        userData := executeDB("SELECT id, email, username, avatar_url FROM users WHERE id = ?", cfAccount.UserID)
        var user map[string]interface{}
        if json.Unmarshal(userData, &user) == nil {
            return models.SuccessResponse(user)
        }
    }

    // 2. 신규 사용자 처리
    userData := executeDB("SELECT id FROM users WHERE email = ?", req.Email)
    var existingUser struct{ ID string `json:"id"` }
    isNewUser := false
    var userId string

    if err := json.Unmarshal(userData, &existingUser); err != nil || existingUser.ID == "" {
        isNewUser = true
        username := req.Username
        if username == "" { username = req.Email }
        
        res := executeDB("INSERT INTO users (id, email, username, avatar_url, status, created_at, updated_at) VALUES (lower(hex(randomblob(8))), ?, ?, ?, 'active', unixepoch(), unixepoch()) RETURNING id", req.Email, username, req.AvatarUrl)
        var newUser struct{ ID string `json:"id"` }
        json.Unmarshal(res, &newUser)
        userId = newUser.ID
    } else {
        userId = existingUser.ID
    }

    // 3. CF 계정 연결
    executeDB("INSERT INTO user_cloudflare_accounts (id, user_id, cloudflare_account_id, email, oauth_token, refresh_token, expires_at, created_at, updated_at) VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())", userId, req.CfAccountId, req.Email, req.OAuthToken, req.RefreshToken, req.ExpiresAt)

    // 4. 최종 사용자 정보 반환
    finalUserData := executeDB("SELECT id, email, username, avatar_url FROM users WHERE id = ?", userId)
    return models.SuccessResponse(json.RawMessage(finalUserData))
}
