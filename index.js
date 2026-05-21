const express = require('express')
const app = express()
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config()

const port =process.env.PORT || 8000
app.use(cors());
app.use(express.json())

 app.get('/', async(req, res)=>{
      
        res.send("server is running")
    })

const uri =process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   
    await client.connect();

    const database = client.db("MediQueueDB");
    const tutorsCollection = database.collection("MediQueueTutors");
    const bookingsCollection = database.collection("bookings");
    
    app.get('/allTutors', async(req, res)=>{
         const cursor = tutorsCollection.find()
         const result = await cursor.toArray();
        res.send(result)
    })

     app.get('/allTutors/:id', async(req, res)=>{
         const id = req.params.id;
         const query = {_id: new ObjectId(id)}
         const result = await tutorsCollection.findOne(query)
        res.send(result)
    })

    app.get('/availableTutors', async(req, res)=>{
        const tutors = await tutorsCollection
            .aggregate([
            { $limit: 6 }
            ])
            .toArray();
        res.send(tutors)
    })

    app.post('/bookedSession', async (req, res)=>{
      const bookingsData = req.body;
      const result = await bookingsCollection.insertOne(bookingsData)
      res.json(result)

    })

     app.get('/bookedSession/:userId', async(req, res)=>{
         const userId = req.params.userId;
         const result = await bookingsCollection.find({userId}).toArray()
        res.json(result)
    })


   

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})