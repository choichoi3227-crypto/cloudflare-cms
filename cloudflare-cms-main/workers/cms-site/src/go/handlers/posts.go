// workers/cms-site/src/go/handlers/posts.go
package handlers

import (
    "cloudpress-platform-api/models"
    "encoding/json"
)

func HandleListPosts(page, perPage int, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    offset := (page - 1) * perPage
    
    // 총 개수 조회
    countData := executeDB("SELECT COUNT(*) as count FROM posts WHERE status = 'published'")
    var countStruct struct{ Count int `json:"count"` }
    json.Unmarshal(countData, &countStruct)
    total := countStruct.Count

    // 목록 조회
    postsData := executeDB("SELECT id, title, slug, excerpt, featured_image, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT ? OFFSET ?", perPage, offset)
    
    type Meta struct {
        Page       int `json:"page"`
        PerPage   int `json:"per_page"`
        Total     int `json:"total"`
        TotalPages int `json:"total_pages"`
    }
    totalPages := 0
    if total > 0 {
        totalPages = (total + perPage - 1) / perPage
    }

    return models.MustMarshal(map[string]interface{}{
        "success": true,
        "data":    json.RawMessage(postsData),
        "meta":   Meta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages},
    })
}

func HandleGetPost(slug string, executeDB func(sql string, params ...interface{}) json.RawMessage) []byte {
    postData := executeDB("SELECT * FROM posts WHERE slug = ? AND status = 'published'", slug)
    var post map[string]interface{}
    if err := json.Unmarshal(postData, &post); err != nil || post == nil || post["id"] == nil {
        return []byte(`{"success":false,"error":{"code":"NOT_FOUND","message":"게시글을 찾을 수 없습니다."}}`)
    }

    // 카테고리 조회
    catsData := executeDB("SELECT c.* FROM categories c INNER JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?", post["id"])
    // 태그 조회
    tagsData := executeDB("SELECT t.* FROM tags t INNER JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?", post["id"])

    // 결과 병합 (Go에서 안전하게 JSON 조작)
    var cats, tags []interface{}
    json.Unmarshal(catsData, &cats)
    json.Unmarshal(tagsData, &tags)
    post["categories"] = cats
    post["tags"] = tags

    return models.SuccessResponse(post)
}
