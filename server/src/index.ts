import { server } from "./app";

const port = parseInt(process.env.PORT ?? "3000");

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
