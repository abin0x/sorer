import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AssigneeSelect({ value, onValueChange, placeholder = "Select assignee" }) {
  const [open, setOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const handleInvite = () => {
    if (!newUserEmail.trim() || !newUserName.trim()) {
      toast.error("Please enter both email and name");
      return;
    }

    toast.info("To invite a new user, please use the User Panel or contact your administrator");
    setIsInviting(false);
    setNewUserEmail("");
    setNewUserName("");
  };

  const filteredMembers = teamMembers.filter(member =>
    (member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedMember = teamMembers.find(m => m.email === value);

  return (
    <>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between dark:bg-slate-800 dark:border-slate-700"
            >
              {selectedMember ? (selectedMember.full_name || selectedMember.email) : (value || placeholder)}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search team members..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No team member found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      onValueChange("");
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    Unassigned
                  </CommandItem>
                  {filteredMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.email}
                      onSelect={() => {
                        onValueChange(member.email);
                        setOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      {member.full_name || member.email}
                      {member.custom_role && (
                        <span className="text-xs text-slate-500 ml-2">
                          ({member.custom_role})
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          onClick={() => setIsInviting(true)}
          variant="outline"
          size="sm"
          className="w-full dark:border-slate-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite New User
        </Button>
      </div>

      <Dialog open={isInviting} onOpenChange={setIsInviting}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-slate-300">Full Name</label>
              <Input
                placeholder="John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-slate-300">Email Address</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              Note: User invitations are managed through the User Panel. This will notify an administrator to invite this user.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviting(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-700">
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}