from google.genai import types

MODEL = "gemini-3.8-flash"
retry_config = types.GenerateContentConfig(
    http_options=types.HttpOptions(
        retry_options=types.HttpRetryOptions(
            attempts=2,
            initial_delay=4.0,
            max_delay=12.0,
            exp_base=2.0,
            http_status_codes=[429, 503],
        )
    )
)
