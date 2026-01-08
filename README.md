# Hardware Savings Calculator

This project is a simple web-based utility that compares two approaches to deploying AI-powered camera systems:

1) Traditional approach using smart Edge AI cameras  
2) Sighthound approach using a centralized Compute Node with standard IP cameras  

The goal is to clearly show **hardware cost savings** when AI compute is centralized at the edge.

---

## Core Idea

Instead of embedding AI compute inside every camera, Sighthound uses a dedicated **Compute Node** that connects to multiple standard IP cameras and runs AI locally.

This reduces:
- Upfront hardware cost
- Deployment complexity
- Camera replacement requirements

---

## Fixed Assumptions

These assumptions are intentionally locked and should not be modified by users or code logic.

- Each Sighthound Compute Node supports **up to 4 cameras**
- Cost per Compute Node: **$3,500**
- Calculator is **hardware-only**
- No cloud, SaaS, bandwidth, or labor costs are included

---

## User Inputs

### Total Cameras
- Integer
- Range: 1–10,000

### Cost per Smart AI Camera
- Default: $3,000
- Range: $1.00–$10,000.00
- If left blank, defaults to $3,000

### Cost per Standard IP Camera
- Default: $250
- Range: $1.00–$10,000.00
- If left blank, defaults to $250

---

## Calculation Logic

### Nodes Required
Each Compute Node supports up to 4 cameras.

nodesNeeded = ceil(totalCameras / 4)

### Current (Smart Camera) Cost
currentTotal = totalCameras × smartCameraCost

### Sighthound Cost
sighthoundTotal =
(nodesNeeded × 3500) + (totalCameras × dumbCameraCost)

### Savings
savings = currentTotal − sighthoundTotal

### Percent Reduction
percentReduction =
(savings / currentTotal) × 100

### Cost Per Camera
costPerCameraBefore = currentTotal / totalCameras  
costPerCameraAfter = sighthoundTotal / totalCameras  

---

## Example

For 4 cameras:

- Smart cameras: 4 × $3,000 = $12,000
- Sighthound:
  - 1 Compute Node × $3,500
  - 4 IP cameras × $250 = $1,000
  - Total = $4,500

Savings:
- $7,500 saved
- 62.5% reduction
- Cost per camera drops from $3,000 to $1,125

---

## Design Principles

- Simple math
- Transparent assumptions
- No marketing language
- No hidden multipliers
- Results should always be shown, even if savings are negative

---

## Purpose

This calculator exists to help:
- Customers sanity-check hardware decisions
- Partners explain edge-compute economics
- Sales teams demonstrate cost consolidation clearly
