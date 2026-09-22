export type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active?: boolean;
};

export type ShiftDto = {
  id: string;
  start: string;
  end: string;
  roleRequirement: string | null;
  location: string | null;
  notes: string | null;
  assigneeId: string | null;
  organizationId: string;
  assignee?: StaffUser | null;
};

export type SwapDto = {
  id: string;
  status: string;
  note: string | null;
  fromUserId: string;
  toUserId: string | null;
  shiftId: string;
  shift: ShiftDto;
  fromUser: StaffUser;
  toUser: StaffUser | null;
};

export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};
