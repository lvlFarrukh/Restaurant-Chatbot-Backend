import mongoose from "mongoose";

export default mongoose.connect(process.env.DB_CONNECTION)
    .then(() => {
        console.log("database is successfully connected!")
    })
    .catch((e) => {
        console.log(e.message)
    })
