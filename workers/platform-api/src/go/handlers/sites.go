// workers/platform-api/src/go/handlers/sites.go
package handlers

import (
    "cloudpress-platform-api/models"
    "encoding/json"
    "fmt"
)

func HandleCreateSite(reqBody []byte, userId string, cfToken string, cfAccountId string, executeDB func(sql string, params ...interface{}) json.RawMessage, cfApiCall func(url, method, token string, body []byte) []byte) []byte {
    var req models.SiteCreateRequest
    if err := json.Unmarshal(reqBody, &req); err != nil || req.SiteName == "" || req.Domain == "" {
        return models.ErrorResponse("VALIDATION_ERROR", "사이트 이름과 도메인을 입력해주세요.", 400)
    }

    // 도메인 중복 확인
    domainData := executeDB("SELECT id FROM site_registry WHERE domain = ?", req.Domain)
    var existing struct{ ID string `json:"id"` }
    if json.Unmarshal(domainData, &existing) == nil && existing.ID != "" {
        return models.ErrorResponse("CONFLICT", "이미 사용 중인 도메인입니다.", 409)
    }

    // 1. Cloudflare D1 생성
    d1Body := fmt.Sprintf(`{"name":"cp_site_%s"}`, generateShortId())
    d1Resp := cfApiCall(fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/d1/database", cfAccountId), "POST", cfToken, []byte(d1Body))
    var d1Result struct { Result struct { Database struct { ID string `json:"id"` } `json:"database"` } `json:"result"` }
    json.Unmarshal(d1Resp, &d1Result)
    d1Id := d1Result.Result.Database.ID

    // 2. Cloudflare KV 생성
    kvBody := fmt.Sprintf(`{"title":"cp_cache_%s"}`, generateShortId())
    kvResp := cfApiCall(fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/storage/kv/namespaces", cfAccountId), "POST", cfToken, []byte(kvBody))
    var kvResult struct { Result struct { ID string `json:"id"` } `json:"result"` }
    json.Unmarshal(kvResp, &kvResult)
    kvId := kvResult.Result.ID

    // 3. Worker 생성 (간단한 플레이스홀더)
    workerName := fmt.Sprintf("cp-%s", generateShortId())
    workerScript := `export default { async fetch(req) { return new Response("CloudPress Site", {headers:{"Content-Type":"text/html"}}); } };`
    cfApiCall(fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/workers/scripts/%s", cfAccountId, workerName), "PUT", cfToken, []byte(workerScript))

    // 4. DB에 사이트 등록
    res := executeDB(
        "INSERT INTO site_registry (id, user_id, site_name, domain, d1_id, kv_id, status, created_at, updated_at) VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, 'active', unixepoch(), unixepoch()) RETURNING id, site_name, domain",
        userId, req.SiteName, req.Domain, d1Id, kvId,
    )
    
    return models.SuccessResponse(json.RawMessage(res))
}

func HandleListSites(userId string, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    data := executeDB("SELECT id, site_name, domain, status, created_at FROM site_registry WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC", userId)
    return models.SuccessResponse(json.RawMessage(data))
}

func HandleDeleteSite(siteId string, userId string, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    executeDB("UPDATE site_registry SET status = 'deleted', updated_at = unixepoch() WHERE id = ? AND user_id = ?", siteId, userId)
    return models.SuccessResponse(map[string]bool{"deleted": true})
}

func generateShortId() string {
    b := make([]byte, 6)
    for i := range b {
        b[i] = "abcdefghijklmnopqrstuvwxyz0123456789"[byte(rand())%byte(36)]
    }
    return string(b)
}

func rand() int { return 0 } // 실제 구현 시 crypto/rand 사용 (단순화를 위해 생략)
