# Invitation System - Complete Workflow

## Overview
This document describes the complete workflow for the consultant-customer invitation system, from sending invitations to accepting them.

---

## 🔄 Complete Workflow

### **Step 1: Consultant Sends Invitation**

**Location:** `/consultant/invitations` page

**Process:**
1. Consultant enters customer email (required), name (optional), and message (optional)
2. Frontend calls `consultantApi.sendInvitation()`
3. Backend (`POST /api/consultant/invitations`):
   - Validates email is provided
   - Checks if user with that email exists
   - Verifies user role is 'customer'
   - Checks if relationship already exists
   - Creates `customer_consultants` record with:
     - `consultant_id`: Consultant's user ID
     - `customer_id`: Customer's user ID
     - `status`: 'pending'
     - `created_at`: Current timestamp
   - Returns invitation details

**Result:** 
- Invitation appears in consultant's invitation history
- Status: "pending"
- Expires in 30 days

---

### **Step 2: Customer Receives Notification**

**Current Implementation:**
- Invitation is stored in database
- Customer can see it on `/app/invitations` page
- **TODO:** Email notification (backend has TODO comment)

**Future Enhancement:**
- Send email to customer with invitation details
- Include link to accept invitation
- Include consultant's message if provided

---

### **Step 3: Customer Views Invitations**

**Location:** `/app/invitations` page

**Process:**
1. Customer navigates to "Convites" in sidebar
2. Frontend calls `customerApi.getInvitations()`
3. Backend (`GET /api/customer/invitations`):
   - Fetches all `customer_consultants` records where:
     - `customer_id` = logged-in customer's ID
     - `status` = 'pending'
   - Joins with `users` table to get consultant details
   - Returns:
     - Consultant name and email
     - Invitation ID
     - Sent date
     - Expiration date (30 days from creation)
     - Status

**Display:**
- Shows all pending invitations
- Displays consultant name and email
- Shows time remaining until expiration
- Highlights expired invitations

---

### **Step 4: Customer Accepts Invitation**

**Process:**
1. Customer clicks "Aceitar" button on an invitation
2. Frontend calls `customerApi.acceptInvitation(invitationId)`
3. Backend (`POST /api/customer/invitations/:id/accept`):
   - Validates invitation exists and belongs to customer
   - Checks if invitation is expired
   - Checks if already accepted
   - Updates `customer_consultants` record:
     - `status`: 'pending' → 'active'
     - `updated_at`: Current timestamp
   - Clears consultant dashboard cache
   - Returns updated invitation

**Result:**
- Relationship status changes to 'active'
- Consultant can now view customer's data
- Invitation removed from pending list
- Toast notification confirms acceptance

---

### **Step 5: Customer Declines Invitation**

**Process:**
1. Customer clicks "Recusar" button
2. Confirmation dialog appears
3. Customer confirms
4. Frontend calls `customerApi.declineInvitation(invitationId)`
5. Backend (`POST /api/customer/invitations/:id/decline`):
   - Validates invitation exists and belongs to customer
   - Checks if already accepted (cannot decline accepted invitations)
   - Deletes `customer_consultants` record
   - Clears consultant dashboard cache
   - Returns success message

**Result:**
- Invitation is permanently removed
- Consultant sees status as "declined" or removed
- Toast notification confirms decline

---

## 📊 Database Schema

### `customer_consultants` Table

```sql
CREATE TABLE customer_consultants (
  id                 UUID PRIMARY KEY,
  customer_id        UUID REFERENCES users(id),
  consultant_id      UUID REFERENCES users(id),
  is_primary         BOOLEAN DEFAULT FALSE,
  can_view_all       BOOLEAN DEFAULT TRUE,
  can_message        BOOLEAN DEFAULT TRUE,
  can_generate_reports BOOLEAN DEFAULT TRUE,
  status             TEXT DEFAULT 'active', -- 'pending', 'active', 'paused', 'revoked', 'expired'
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, consultant_id)
);
```

**Status Values:**
- `pending`: Invitation sent, awaiting customer response
- `active`: Invitation accepted, relationship active
- `paused`: Relationship temporarily paused
- `revoked`: Customer revoked access
- `expired`: Invitation expired (30 days)

---

## 🔌 API Endpoints

### Consultant Endpoints

**GET `/api/consultant/invitations`**
- Returns all invitations sent by consultant
- Includes status, dates, customer info

**POST `/api/consultant/invitations`**
- Creates new invitation
- Requires: `email` (customer email)
- Optional: `name`, `message`
- Returns: Created invitation

### Customer Endpoints

**GET `/api/customer/invitations`**
- Returns all pending invitations for customer
- Includes consultant details, expiration info

**POST `/api/customer/invitations/:id/accept`**
- Accepts an invitation
- Updates status to 'active'
- Returns: Updated invitation

**POST `/api/customer/invitations/:id/decline`**
- Declines an invitation
- Deletes the record
- Returns: Success message

**GET `/api/customer/consultants`**
- Returns all active consultants for customer
- Shows accepted relationships

---

## 🎯 User Flows

### Flow 1: Successful Invitation Acceptance

```
Consultant → Sends Invitation → Database (status: 'pending')
    ↓
Customer → Views Invitations Page → Sees Pending Invitation
    ↓
Customer → Clicks "Aceitar" → API Call → Database (status: 'active')
    ↓
Consultant → Can Now View Customer Data
Customer → Can See Consultant in Active Consultants List
```

### Flow 2: Invitation Decline

```
Consultant → Sends Invitation → Database (status: 'pending')
    ↓
Customer → Views Invitations Page → Sees Pending Invitation
    ↓
Customer → Clicks "Recusar" → Confirms → API Call → Record Deleted
    ↓
Consultant → Sees Invitation Removed from History
```

### Flow 3: Expired Invitation

```
Consultant → Sends Invitation → Database (status: 'pending', expires_at: +30 days)
    ↓
30 Days Pass
    ↓
Customer → Views Invitations Page → Sees Expired Invitation
    ↓
Customer → Cannot Accept (Button Disabled)
    ↓
Customer → Can Remove Expired Invitation
```

---

## 🔐 Security & Validation

1. **Authentication Required:**
   - All endpoints require JWT authentication
   - Role-based access control (consultant vs customer)

2. **Authorization Checks:**
   - Consultants can only see their own invitations
   - Customers can only see invitations sent to them
   - Customers can only accept/decline their own invitations

3. **Validation:**
   - Email must exist in system
   - User must have 'customer' role
   - Duplicate invitations prevented
   - Expiration date checked before acceptance

4. **Data Integrity:**
   - UNIQUE constraint on (customer_id, consultant_id)
   - Cascade delete on user deletion
   - Timestamps for audit trail

---

## 🚀 Future Enhancements

1. **Email Notifications:**
   - Send email when invitation is sent
   - Send reminder before expiration
   - Send notification when accepted/declined

2. **Invitation Links:**
   - Generate unique tokens for invitation links
   - Allow registration via invitation link
   - Auto-accept on registration via link

3. **Bulk Operations:**
   - Send multiple invitations at once
   - Bulk accept/decline

4. **Analytics:**
   - Track acceptance rates
   - Monitor invitation performance
   - Show consultant invitation stats

5. **Custom Permissions:**
   - Allow customers to set specific permissions per consultant
   - Granular access control

---

## 📝 Implementation Checklist

- ✅ Backend endpoints for consultant invitations
- ✅ Backend endpoints for customer invitation management
- ✅ Customer invitations page UI
- ✅ Accept/Decline functionality
- ✅ Expiration handling
- ✅ Route and menu integration
- ⏳ Email notifications (TODO)
- ⏳ Invitation link tokens (TODO)
- ⏳ Registration via invitation link (TODO)

---

## 🐛 Known Limitations

1. **User Must Exist:**
   - Currently requires customer to be registered before invitation
   - Cannot invite non-registered users

2. **Hardcoded Link:**
   - Invitation link is hardcoded (`consultant-abc123xyz`)
   - Not functional yet

3. **No Email Sending:**
   - Email notification not implemented
   - Customers must check invitations page manually

4. **No Auto-Expiration:**
   - Expired invitations remain in database
   - Manual cleanup or scheduled job needed

---

## 📚 Related Files

**Backend:**
- `/backend/src/routes/consultant.ts` - Consultant invitation endpoints
- `/backend/src/routes/customer.ts` - Customer invitation endpoints
- `/backend/schema.sql` - Database schema

**Frontend:**
- `/frontend/src/pages/consultant/SendInvitations.tsx` - Consultant invitation page
- `/frontend/src/pages/Invitations.tsx` - Customer invitations page
- `/frontend/src/lib/api.ts` - API client methods
- `/frontend/src/App.tsx` - Routes
- `/frontend/src/components/layout/Sidebar.tsx` - Navigation menu
