const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

// Configurações do MongoDB
const usuario = process.env.USUARIO;
const senha = process.env.SENHA;
const nomeBancoDados = "LotsCaixas";

const app = express();
const Port = process.env.PORT || 3001;

// Conectar ao MongoDB
mongoose
  .connect(
    `mongodb+srv://${usuario}:${senha}@lotscaixas.paquwbm.mongodb.net/${nomeBancoDados}`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Banco de dados conectado"))
  .catch((err) => console.error("Erro ao conectar ao banco de dados:", err));

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Modelo para as tags
const TagSchema = new mongoose.Schema({
  tagId: { type: String, required: true, unique: true },
  status: { type: String, default: "lida" }, // Exemplos de status: 'lida', 'em movimento', 'entregue', 'avariada'
  updatedAt: { type: Date, default: Date.now },
});
const Tag = mongoose.model("Tag", TagSchema);

// Endpoint para receber dados do ESP32
app.post("/tags", async (req, res) => {
  try {
    const { tags, totalTags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ message: "Formato inválido. 'tags' deve ser um array." });
    }

    const updates = tags.map((tagId) => ({
      updateOne: {
        filter: { tagId },
        update: { $set: { tagId, updatedAt: new Date() } },
        upsert: true, // Insere o documento caso ele não exista
      },
    }));

    // Realiza a operação em massa no MongoDB
    const result = await Tag.bulkWrite(updates);

    res.status(200).json({
      message: "Tags processadas com sucesso.",
      totalTags,
      matchedCount: result.matchedCount,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Erro ao processar tags:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Endpoint para listar todas as tags
app.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find().sort({ updatedAt: -1 });
    res.status(200).json({ message: "Tags recuperadas com sucesso.", tags });
  } catch (error) {
    console.error("Erro ao recuperar tags:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Endpoint para atualizar status de uma tag
app.put("/tags/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const tag = await Tag.findOneAndUpdate(
      { tagId: id },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );

    if (!tag) {
      return res.status(404).json({ message: "Tag não encontrada." });
    }

    res.status(200).json({ message: "Status atualizado com sucesso.", tag });
  } catch (error) {
    console.error("Erro ao atualizar status da tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Endpoint para deletar uma tag
app.delete("/tags/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Tag.deleteOne({ tagId: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Tag não encontrada." });
    }

    res.status(200).json({ message: "Tag deletada com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Iniciar o servidor
app.listen(Port, () => {
  console.log(`Servidor escutando na porta ${Port}`);
});