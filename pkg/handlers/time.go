package handlers

import (
	"errors"
	"time"

	"github.com/sre/assistant/pkg/types"
)

// parseTimeRange 依據第 5.1 節需求將前端字串轉換為 time.Time。
func parseTimeRange(tr types.TimeRange, emptyMessage string) (types.ParsedTimeRange, error) {
	if tr.From == "" || tr.To == "" {
		return types.ParsedTimeRange{}, errors.New(emptyMessage)
	}

	from, err := time.Parse(time.RFC3339, tr.From)
	if err != nil {
		return types.ParsedTimeRange{}, err
	}

	to, err := time.Parse(time.RFC3339, tr.To)
	if err != nil {
		return types.ParsedTimeRange{}, err
	}

	return types.ParsedTimeRange{From: from, To: to}, nil
}
