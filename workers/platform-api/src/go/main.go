// workers/platform-api/src/go/main.go
package main

import (
    "encoding/json"
)

// 외부(CF Workers JS)에서 호출 가능하도록 export
//export HandleRequest
func HandleRequest(path string, method string, body []byte, headers map[string]string, dbExecutor func(sql string, params ...interface{}) json.RawMessage, cfApiCall func(url, method, token string, body []byte) []byte) []byte {

    switch path {
    case "/api/auth/callback":
        if method == "POST" {
            return HandleAuthCallback(body, dbExecutor)
        }
    case "/api/sites":
        if method == "GET" {
            return HandleListSites(headers["X-User-Id"], dbExecutor)
        }
        if method == "POST" {
            return HandleCreateSite(body, headers["X-User-Id"], headers["X-CF-Token"], headers["X-CF-Account-Id"], dbExecutor, cfApiCall)
        }
    default:
        // 동적 라우팅 (/api/sites/:id)
        if len(path) > len("/api/sites/") && method == "DELETE" {
            siteId := path[len("/api/sites/"):]
            return HandleDeleteSite(siteId, headers["X-User-Id"], dbExecutor)
        }
    }

    return []byte(`{"success":false,"error":{"code":"NOT_FOUND","message":"API를 찾을 수 없습니다."}}`)
}
