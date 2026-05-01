# Zimbra Mock Server

Serveur de test émulant l'API SOAP Zimbra pour le plugin **ZimbraMailNotifier**.  
**Aucune dépendance npm** — uniquement les modules natifs Node.js (`http`, `crypto`, `url`).

## Démarrage

```bash
node server.js                        # port 3000 par défaut
PORT=8080 node server.js              # port personnalisé
LOG_LEVEL=verbose node server.js      # logs détaillés des payloads SOAP
```

## Configuration du plugin

| Champ              | Valeur                        |
|--------------------|-------------------------------|
| URL Serveur Zimbra | `http://localhost:3000`       |
| URL Interface Web  | `http://localhost:3000/zimbra`|

## Comptes de test

| Login               | Mot de passe | Type           |
|---------------------|--------------|----------------|
| `user@test.local`   | `password`   | Normal         |
| `admin@test.local`  | `admin123`   | Normal         |
| `twofa@test.local`  | `password`   | 2FA (code: `123456`) |

## Dashboard

Ouvrir `http://localhost:3000` dans un navigateur pour accéder au tableau de bord :
- Statistiques en temps réel (sessions, messages, RDV, tâches, WaitSets)
- Ajout de messages non lus, rendez-vous et tâches à chaud
- Reset des données
- Log en direct

## API de contrôle

### État du serveur
```
GET /api/status
```

### Messages non lus
```
# Ajouter
POST /api/messages
{ "subject": "Titre", "from": "exp@test.com", "fromName": "Nom", "abstract": "Extrait" }

# Vider
DELETE /api/messages
```

### Rendez-vous
```
POST /api/appointments
{
  "name": "Titre",
  "startOffset": 30,      # dans X minutes
  "durationMin": 60,
  "location": "Salle A"
}
```

### Tâches
```
POST /api/tasks
{ "name": "Titre", "priority": 5, "percentComplete": 0 }
```

### Reset complet
```
POST /api/reset
```

## Endpoints SOAP émulés

| Requête SOAP            | Description                        |
|-------------------------|------------------------------------|
| `AuthRequest`           | Authentification + 2FA             |
| `GetInfoRequest`        | Infos boîte mail (quota, email)    |
| `SearchRequest`         | Messages, rendez-vous, tâches      |
| `CreateWaitSetRequest`  | Création WaitSet                   |
| `WaitSetRequest`        | Attente événements (block/no-block)|

Le WaitSet en mode `block=1` simule une attente de 5 secondes puis renvoie un événement aléatoire (60% de chance), ce qui déclenche un refresh dans le plugin.

## Exemple avec curl

```bash
# Authentification
curl -X POST http://localhost:3000/service/soap/ \
  -H "Content-Type: application/json" \
  -d '{
    "Header": { "context": { "format": { "type": "js" } } },
    "Body": {
      "AuthRequest": {
        "_jsns": "urn:zimbraAccount",
        "account": { "by": "name", "_content": "user@test.local" },
        "password": { "_content": "password" }
      }
    }
  }'

# Ajouter un message via l'API admin
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{ "subject": "Test urgent", "from": "boss@company.com", "fromName": "Le Boss" }'
```
