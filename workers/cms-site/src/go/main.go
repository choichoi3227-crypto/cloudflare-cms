// workers/cms-site/src/go/main.go
package main

import (
    "encoding/json"
    "strconv"
)

//export HandleRequest
func HandleRequest(path string, method string, body []byte, urlQuery map[string][]string, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    
    switch path {
    case "/api/posts":
        if method == "GET" {
            page := 1
            perPage := 10
            if p, ok := urlQuery["page"]; ok && len(p) > 0 {
                if v, err := strconv.Atoi(p[0]); err == nil { page = v }
            }
            return HandleListPosts(page, perPage, executeDB)
        }
    default:
        // /api/posts/{slug} 동적 라우팅
        if len(path) > len("/api/posts/") && method == "GET" {
            slug := path[len("/api/posts/"):]
            return HandleGetPost(slug, executeDB)
        }
    }

    return []byte(`{"success":false,"error":{"code":"NOT_FOUND","message":"Not found"}}`)
}
