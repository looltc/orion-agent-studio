export interface LLMProvider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_default: boolean;
  created_at: string;
}
