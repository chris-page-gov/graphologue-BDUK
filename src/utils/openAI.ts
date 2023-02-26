// import { Configuration, OpenAIApi } from 'openai'

// const configuration = new Configuration({
//   apiKey: process.env.REACT_APP_OPENAI_API_KEY,
// })

// export const OpenAI = new OpenAIApi(configuration)

export const getCompletionOptions = (
  prompt: string,
  temperature: number,
  token: number
) => ({
  prompt: prompt,
  ////
  model: 'text-davinci-003',
  temperature: temperature,
  max_tokens: token,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
})

export const getOpenAICompletion = async (
  prompt: string,
  temperature = 0.7,
  token = 512
) => {
  const options = getCompletionOptions(prompt, temperature, token)

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + String(process.env.REACT_APP_OPENAI_API_KEY),
    },
    body: JSON.stringify(options),
  }

  const response = await fetch(
    'https://api.openai.com/v1/completions',
    requestOptions
  )
  const data = await response.json()

  return data
}
