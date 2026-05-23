const express = require('express')
const app = express()
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config()

const port = process.env.PORT || 8000
app.use(cors());
app.use(express.json())

app.get('/', async (req, res) => {
  res.send("server is running")
})

const uri = process.env.MONGODB_URI;

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
    // await client.connect();

    const database = client.db("MediQueueDB");
    const tutorsCollection = database.collection("MediQueueTutors");
    const bookingsCollection = database.collection("bookings");
    const newTutorsCollection = database.collection("newTutors");

    app.get('/allTutors', async (req, res) => {
      try {
        const { search, startDate, endDate } = req.query;
        let query = {};

        if (search && search.trim() !== "") {
          query.name = { $regex: search, $options: 'i' };
        }

        if ((startDate && startDate.trim() !== "") || (endDate && endDate.trim() !== "")) {
          const dateQuery = {};

          if (startDate && startDate.trim() !== "") {
            dateQuery.$gte = startDate;
          }
          if (endDate && endDate.trim() !== "") {
            dateQuery.$lte = endDate;
          }

          if (Object.keys(dateQuery).length > 0) {
            query.sessionStartDate = dateQuery;
          }
        }

        const cursor = tutorsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);

      } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get('/allTutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.findOne(query)
      res.send(result)
    })

    app.get('/availableTutors', async (req, res) => {
      const tutors = await tutorsCollection
        .aggregate([
          { $limit: 6 }
        ])
        .toArray();
      res.send(tutors)
    })

    app.post('/bookedSession', async (req, res) => {
      try {
        const bookingsData = req.body;
     
        const tutorId = bookingsData.tutorId; 
          
        if (!tutorId) {
          return res.status(400).send({ success: false, message: "Tutor ID is required" });
        }

        const tutorQuery = { _id: new ObjectId(tutorId) };
        const tutor = await tutorsCollection.findOne(tutorQuery);

        if (!tutor) {
          return res.status(404).send({ success: false, message: "Tutor not found" });
        }

      
        if (tutor.totalSlots <= 0) {
          return res.status(400).send({ 
            success: false, 
            message: "This session is fully booked. You can’t join at the moment." 
          });
        }

      
        const bookingResult = await bookingsCollection.insertOne(bookingsData);

        
        const updateResult = await tutorsCollection.updateOne(
          tutorQuery,
          { $inc: { totalSlots: -1 } }
        );

      
        res.json({
          success: true,
          bookingResult,
          updateResult,
          message: "Booking successful"
        });

      } catch (error) {
        console.error("Error in booking session:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
   
    app.get('/bookedSession/:userId', async (req, res) => {
      const userId = req.params.userId;
      const result = await bookingsCollection.find({ userId }).toArray()
      res.json(result)
    })

    app.delete('/bookedSession/:sessionId', async (req, res) => {
      const sessionId = req.params.sessionId;
      const query = { _id: new ObjectId(sessionId) }
      const result = await bookingsCollection.deleteOne(query)
      res.json(result)
    })

    app.post('/MyTutors', async (req, res) => {
      const newTutors = req.body;
      const result = await newTutorsCollection.insertOne(newTutors)
      res.json(result)
    })

    app.get('/MyTutors/:userId', async (req, res) => {
      const userId = req.params.userId;
      const result = await newTutorsCollection.find({ userId }).toArray()
      res.json(result)
    })

    app.delete('/MyTutors/:tutorId', async (req, res) => {
      const tutorId = req.params.tutorId;
      const query = { _id: new ObjectId(tutorId) }
      const result = await newTutorsCollection.deleteOne(query)
      res.json(result)
    })

    app.put('/MyTutors/:tutorId', async (req, res) => {
      try {
        const tutorId = req.params.tutorId;
        const updatedData = req.body;

        const filter = { _id: new ObjectId(tutorId) };
        const updateDoc = {
          $set: {
            name: updatedData.name,
            subject: updatedData.subject,
            hourlyFee: updatedData.fee,
            photoUrl: updatedData.image
          },
        };

        const result = await newTutorsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating tutor:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})