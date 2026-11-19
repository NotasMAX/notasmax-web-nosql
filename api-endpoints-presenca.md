# Endpoints - Presença (NotasMax)

### 1. Registrar presença - Aluno
* **Método:** `POST`
* **URL:** `http://localhost:5000/NotasMax/Presenca/Registrar`
* **Body:**
```json
{
  "token": "qr-token"
}
```
* **Cookie:**
```json
{
  "Cookie": "jwt=aluno-token"
}
```
---

### 2. Listar presenças por simulado
* **Método:** `GET`
* **URL:** `http://localhost:5000/NotasMax/Presenca/Simulado/{simulado_id}`

---

### 3. Gerar QR Code
* **Método:** `POST`
* **URL:** `http://localhost:5000/NotasMax/Presenca/Qr/Gerar`
* **Body:**
```json
{
  "simulado_id": "id"
}
```

---

### 4. Visualizar token QR de um simulado
* **Método:** `GET`
* **URL:** `http://localhost:5000/NotasMax/Presenca/Qr/Simulado/{simulado_id}`

---

### 5. Revogar QR Code
* **Método:** `PATCH`
* **URL:** `http://localhost:5000/NotasMax/Presenca/Qr/{qr_id}/Revogar`