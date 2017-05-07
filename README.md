# Ringobot

This is a slack bot. It passes heard messages to any plugin in the `plugins`
directory. If any plugin returns a value, ringobot sends that response.
Responses appear in the room they were heard.

# ENV variables

- `SLACKIN_BOT_TOKEN`: your slack bot token 
  - create/manage your bots under `<your_org>.slack.com/apps/manage/custom-integrations`
  - you need to `/invite` your bot into a channel, for it to hear/respond
- `RINGOBOT_SECRETS_KEY`: token for reading secret configs
  - secret files are stored in `/secrets` (currently only trivia_questions)
  - get this from Jake if you need add/edit secret values, like trivia questions
