package internal

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv" // Import this
	"github.com/supabase-community/supabase-go"
)

var supabaseClient *supabase.Client

func InitializeSupabaseClient() { // Fixed a small typo in "Initialize"
	// Load the .env file (optional in Docker)
	_ = godotenv.Load()

	apiUrl := os.Getenv("SUPABASE_URL")
	apiKey := os.Getenv("SUPABASE_KEY")

	// Quick check to see if they are actually there
	if apiUrl == "" || apiKey == "" {
		log.Fatal("SUPABASE_URL or SUPABASE_KEY is not set in the environment")
	}

	var err error
	supabaseClient, err = supabase.NewClient(apiUrl, apiKey, &supabase.ClientOptions{})
	if err != nil {
		fmt.Println("Failed to initialize the client: ", err)
	}
}

func GetSupabaseClient() *supabase.Client {
	return supabaseClient
}

func GetEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
