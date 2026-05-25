// OBS integration is only available when running locally.
// On cloud deployment this endpoint returns a helpful error.
export default function handler(_req, res) {
  return res.status(503).json({
    error: 'OBS連携はローカル環境でのみ利用できます',
    hint: 'ローカルで npm start を実行してください',
  });
}
