# SIT737-2025-Prac7P: Calculator Microservice with MongoDB

## Overview

This project enhances my calculator microservice (Prac 6C) by adding MongoDB on `sit737-cluster` (GKE), implementing full CRUD operations, high availability with a replica set, and hourly backups. It runs on Kubernetes with persistent storage and logs calculation history.

## GitHub Repository

[https://github.com/IAMTHENORMALDUDE/sit737-2025-prac7p](https://github.com/IAMTHENORMALDUDE/sit737-2025-prac7p)

## Setup Instructions

### Prerequisites

- Docker, Node.js, Git, `gcloud`, `kubectl`.
- GCP project `sit737-25t1-vazirnia-7c6f971`, cluster `sit737-cluster`.

### Clone the Repo

```bash
git clone https://github.com/IAMTHENORMALDUDE/sit737-2025-prac7p.git
cd sit737-2025-prac7p
```

````

### Deploy MongoDB

1. Apply storage and service:
   ```bash
   kubectl apply -f mongo-pvc.yaml
   kubectl apply -f mongo-service.yaml
   kubectl apply -f mongo-deployment.yaml
   ```
2. Set up MongoDB user:
   ```bash
   kubectl port-forward service/mongo-service 27017:27017
   mongosh "mongodb://localhost:27017"
   use calculator_db
   db.createUser({ user: "calcuser", pwd: "calcpassword", roles: [{ role: "readWrite", db: "calculator_db" }] })
   exit
   ```
3. Create secret:
   ```bash
   kubectl apply -f mongo-secret.yaml
   ```

### Deploy Application

1. Build and push image:
   ```bash
   docker build -t calculator-microservice:3.0 .
   docker tag calculator-microservice:3.0 australia-southeast1-docker.pkg.dev/sit737-25t1-vazirnia-7c6f971/sit737-25t1-vazirnia/calculator-microservice:3.0
   gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://australia-southeast1-docker.pkg.dev
   docker push australia-southeast1-docker.pkg.dev/sit737-25t1-vazirnia-7c6f971/sit737-25t1-vazirnia/calculator-microservice:3.0
   ```
2. Recreate image pull secret:
   ```bash
   kubectl create secret docker-registry gcr-secret --docker-server=https://australia-southeast1-docker.pkg.dev --docker-username=oauth2accesstoken --docker-password="$(gcloud auth print-access-token)" --docker-email=my-deakin-email@deakin.edu.au
   ```
3. Deploy:
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   ```

### Configure High Availability

1. Initialize replica set:
   ```bash
   kubectl exec -it mongo-0 -- mongosh
   rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongo-0.mongo-service.default.svc.cluster.local:27017", priority: 2 }, { _id: 1, host: "mongo-1.mongo-service.default.svc.cluster.local:27017", priority: 1 }, { _id: 2, host: "mongo-2.mongo-service.default.svc.cluster.local:27017", priority: 1 }] })
   ```

### Set Up Backups

1. Apply backup PVC and CronJob:
   ```bash
   kubectl apply -f mongo-backup-pvc.yaml
   kubectl apply -f mongo-backup-cronjob.yaml
   ```

## Test CRUD Operations

- Access: `http://34.87.202.119`
- Examples:
  - Create: `http://34.87.202.119/add?num1=5&num2=3`
  - Read: `http://34.87.202.119/history`
  - Update: `curl -X PUT "http://34.87.202.119/history/[id]?num1=4&num2=2&operation=power"`
  - Delete: `curl -X DELETE "http://34.87.202.119/history/[id]"`

**[Screenshot Placeholder: CRUD Operations]**

- _Screenshots of Create, Read, Update, Delete responses._

## Files

- `Dockerfile`: Node.js image for calculator.
- `index.js`: App with CRUD and MongoDB integration (v3.0).
- `deployment.yaml`, `service.yaml`: Calculator Kubernetes configs.
- `mongo-*.yaml`: MongoDB StatefulSet, service, and PVC.
- `mongo-backup-*.yaml`: Backup PVC and CronJob.

## Verification

- Pods: `kubectl get pods`
- Service: `kubectl get svc`
- Replica Set: `kubectl exec -it mongo-0 -- mongosh --eval "rs.status()"`

## Notes

- Replace `[id]` with actual `_id` from `/history`.
- Refresh `gcr-secret` if token expires (60 mins).
- External IP: `34.87.202.119`.

## Reflection

Adding MongoDB with CRUD, HA, and backups made my microservice more robust. Debugging the headless service and replica set was a key learning experience.
````
