package internal

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

// NewSupabaseClient creates a database client from environment configuration.
// It returns errors to the caller instead of terminating the process so the
// package remains reusable and testable.
func NewSupabaseClient() (*supabase.Client, error) {
	_ = godotenv.Load()

	apiURL := os.Getenv("SUPABASE_URL")
	apiKey := os.Getenv("SUPABASE_KEY")
	if apiURL == "" || apiKey == "" {
		return nil, fmt.Errorf("SUPABASE_URL and SUPABASE_KEY must be set")
	}

	client, err := supabase.NewClient(apiURL, apiKey, &supabase.ClientOptions{})
	if err != nil {
		return nil, fmt.Errorf("create Supabase client: %w", err)
	}

	return client, nil
}

func GetEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
