import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
