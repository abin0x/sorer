import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Draggable } from "@hello-pangea/dnd";
import Column from "../components/kanban/Column";
import ProgramCard from "../components/kanban/ProgramCardEnhanced";
import ProgramDialog from "../components/kanban/ProgramDialog";
import FilterBar from "../components/kanban/FilterBar";
import MultiBranchSelect from "../components/shared/MultiBranchSelect";
import ProgramFullDetailsDialog from "../components/program/ProgramFullDetailsDialogNew";
import BulkUploadDialog from "../components/program/BulkUploadDialog";
import BulkImportDialog from "../components/kanban/BulkImportDialog";

import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

import { toast } from "sonner";
import { formatProgramAssignmentEmail, sendEmail, sendBulkEmails } from "../components/utils/emailTemplates";

const COLUMNS = ["todo", "in_progress", "in_review", "done"];

export default function Kanban() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [initialStatus, setInitialStatus] = useState("todo");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedGender, setSelectedGender] = useState("all");

  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list("-created_date"),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Kanban module is gated behind the Club Kanban plugin being activated
  const { data: plugins = [], isLoading: pluginsLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: () => base44.entities.Plugin.list("order", 50),
  });
  const kanbanPlugin = plugins.find((p) => p.key === "club_kanban");
  const kanbanActive = kanbanPlugin?.is_active === true;

  const createProgramMutation = useMutation({
    mutationFn: (programData) => base44.entities.Program.create({
      ...programData,
      created_by_email: currentUser?.email
    }),
    onSuccess: async (newProgram) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully");
      setProgramDialogOpen(false);
      
      // Send email to assignee and admins if assigned
      if (newProgram.assignee && currentUser) {
        try {
          const assignee = teamMembers.find(m => m.email === newProgram.assignee);
          const admins = teamMembers.filter(m => m.role === 'admin' || m.role === 'director');
          
          if (assignee) {
            const emailContent = formatProgramAssignmentEmail(newProgram, assignee, currentUser);
            
            // Send to assignee
            await sendEmail({
              to: assignee.email,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban"
            });
            
            // Send to all admins
            if (admins.length > 0) {
              const adminEmails = admins.map(a => a.email).filter(email => email !== assignee.email);
              if (adminEmails.length > 0) {
                await sendBulkEmails({
                  recipients: adminEmails,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  from_name: "Jaguars Kanban"
                });
              }
            }
            
            toast.success("Email notifications sent");
          }
        } catch (error) {
          console.error("Failed to send assignment email", error);
          toast.error("Program created but email notification failed");
        }
      }
    },
    onError: (error) => {
      console.error("Failed to create program:", error);
      toast.error("Failed to create program");
    }
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data, previousData }) => base44.entities.Program.update(id, data),
    onSuccess: async (updatedProgram, variables) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully");
      setProgramDialogOpen(false);
      
      // Send email if assignee changed
      const previousData = variables.previousData;
      if (updatedProgram.assignee && 
          previousData?.assignee !== updatedProgram.assignee && 
          currentUser) {
        try {
          const assignee = teamMembers.find(m => m.email === updatedProgram.assignee);
          const admins = teamMembers.filter(m => m.role === 'admin' || m.role === 'director');
          
          if (assignee) {
            const emailContent = formatProgramAssignmentEmail(updatedProgram, assignee, currentUser);
            
            // Send to assignee
            await sendEmail({
              to: assignee.email,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban"
            });
            
            // Send to all admins
            if (admins.length > 0) {
              const adminEmails = admins.map(a => a.email).filter(email => email !== assignee.email);
              if (adminEmails.length > 0) {
                await sendBulkEmails({
                  recipients: adminEmails,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  from_name: "Jaguars Kanban"
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to send assignment email", error);
        }
      }
    },
    onError: (error, variables) => {
      // Put the card back in its original column when the save fails.
      if (variables?.previousPrograms) {
        queryClient.setQueryData(["programs"], variables.previousPrograms);
        toast.error("Couldn't move card. Please try again.");
      } else {
        toast.error("Failed to update program");
      }
      console.error("Failed to update program:", error);
    }
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.Program.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully");
      setProgramDialogOpen(false);
    },
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const program = programs.find((p) => p.id === draggableId);
    if (!program) return;

    const updates = { ...program, status: destination.droppableId };
    
    // Auto-set started_date when moving to in_progress
    if (destination.droppableId === 'in_progress' && !program.started_date) {
      updates.started_date = new Date().toISOString().split('T')[0];
    }
    
    // Auto-set completed_date when moving to done
    if (destination.droppableId === 'done' && !program.completed_date) {
      updates.completed_date = new Date().toISOString().split('T')[0];
    }

    // Show the card in its new column straight away, then persist it.
    const previousPrograms = queryClient.getQueryData(["programs"]);
    queryClient.setQueryData(["programs"], (old = []) =>
      (old || []).map((p) => (p.id === program.id ? { ...p, ...updates } : p))
    );

    updateProgramMutation.mutate({
      id: program.id,
      data: updates,
      previousData: program,
      previousPrograms,
    });
  };

  const handleMoveProgram = (program, newStatus) => {
    const updates = { ...program, status: newStatus };
    if (newStatus === 'in_progress' && !program.started_date) {
      updates.started_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'done' && !program.completed_date) {
      updates.completed_date = new Date().toISOString().split('T')[0];
    }
    updateProgramMutation.mutate({ id: program.id, data: updates, previousData: program });
  };

  const handleSaveProgram = (programData) => {
    if (selectedProgram) {
      updateProgramMutation.mutate({
        id: selectedProgram.id,
        data: programData,
        previousData: selectedProgram,
      });
    } else {
      createProgramMutation.mutate(programData);
    }
  };

  const handleAddProgram = (columnId) => {
    setSelectedProgram(null);
    setInitialStatus(columnId);
    setProgramDialogOpen(true);
  };

  const handleEditProgram = (program) => {
    setSelectedProgram(program);
    setProgramDialogOpen(true);
  };

  const handleViewProgram = (program, action) => {
    setSelectedProgram(program);
    setDetailsDialogOpen(true);
    // Store action for the details dialog to open the right tab
    if (action) {
      setSelectedProgram({ ...program, _openTab: action });
    }
  };

  const handleDeleteProgram = (id) => {
    deleteProgramMutation.mutate(id);
  };

  const handleDownloadExcel = () => {
    try {
      // Create CSV content
      const headers = [
        'Title', 'Description', 'Season', 'Branch', 'Program Dates', 'Program Time',
        'Field Location', 'Field Number', 'Age Eligibility', 'Gender Eligibility',
        'Program Director', 'Suggested Start Date', 'Due Date', 'Completed Date',
        'Status', 'Priority', 'Assignee', 'Created Date'
      ];

      const rows = filteredPrograms.map(program => [
        program.title || '',
        program.description || '',
        program.season || '',
        Array.isArray(program.branches) ? program.branches.join(', ') : (program.branch || ''),
        program.program_dates || '',
        program.program_time || '',
        program.field_location || '',
        program.field_number || '',
        program.age_eligibility || '',
        program.gender_eligibility || '',
        program.program_director || '',
        program.suggested_start_date || '',
        program.due_date || '',
        program.completed_date || '',
        program.status || '',
        program.priority || '',
        program.assignee || '',
        program.created_date ? new Date(program.created_date).toLocaleDateString() : ''
      ].map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }));

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `programs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Programs exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export programs");
    }
  };

  const filteredPrograms = programs.filter((program) => {
    // Role-based filtering
    if (currentUser?.custom_role === "staff") {
      // Staff can only see programs assigned to them
      const isAssigned = program.assignee === currentUser.email;
      const isCreator = program.created_by_email === currentUser.email;
      if (!isAssigned && !isCreator) return false;
    } else if (currentUser?.custom_role === "branch_director") {
      // Branch Directors can ONLY see programs in their branch
      if (!currentUser.branch) return false; // No access if no branch assigned
      const programBranches = Array.isArray(program.branches) ? program.branches : (program.branch ? [program.branch] : []);
      if (programBranches.length === 0 || !programBranches.includes(currentUser.branch)) return false;
    }
    // Admin and Director can see all programs

    const matchesSearch = program.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = selectedAssignee === "all" || program.assignee === selectedAssignee;
    const matchesPriority = selectedPriority === "all" || program.priority === selectedPriority;
    const matchesSeason = selectedSeason === "all" || program.season === selectedSeason;
    const matchesBranch = selectedBranches.length === 0 || (program.branches && program.branches.some(b => selectedBranches.includes(b)));
    const matchesGender = selectedGender === "all" || program.gender_eligibility === selectedGender;
    
    return matchesSearch && matchesAssignee && matchesPriority && matchesSeason && matchesBranch && matchesGender;
  });

  const getProgramsByColumn = (columnId) => {
    return filteredPrograms.filter((program) => program.status === columnId);
  };

  if (isLoading || pluginsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading programs…</p>
      </div>
    );
  }

  // Kanban plugin must be activated to use this module
  if (!kanbanActive) {
    return (
      <div className="flex items-center justify-center h-screen p-6 bg-background">
        <div className="max-w-md text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Kanban Module Deactivated</h2>
          <p className="text-sm text-muted-foreground">
            The Club Kanban plugin is currently turned off. A Master Admin can re-activate it from the Plugin Manager to restore access to programs, tasks, and RACI assignments.
          </p>
        </div>
      </div>
    );
  }

  // Check if Branch Director has no branch assigned
  if (currentUser?.custom_role === "branch_director" && !currentUser.branch) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md adisal-card">
          <CardContent className="pt-6 text-center">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Branch Assigned</h2>
            <p className="text-muted-foreground">
              You need to be assigned to a branch to access the Kanban board. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Kanban Board</div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Program Kanban</h1>
              <p className="text-muted-foreground mt-1.5">Manage your team's programs and workflow</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadExcel}
                variant="outline"
                className="border-border hover:bg-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => setBulkImportDialogOpen(true)}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/5"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    New Program
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAddProgram("todo")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Single Program
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload from Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedAssignee={selectedAssignee}
            onAssigneeChange={setSelectedAssignee}
            selectedPriority={selectedPriority}
            onPriorityChange={setSelectedPriority}
            selectedSeason={selectedSeason}
            onSeasonChange={setSelectedSeason}
            branchFilters={selectedBranches}
            onBranchFiltersChange={setSelectedBranches}
            selectedGender={selectedGender}
            onGenderChange={setSelectedGender}
            teamMembers={teamMembers}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="max-w-[1600px] mx-auto h-full">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {COLUMNS.map((columnId) => {
                const columnPrograms = getProgramsByColumn(columnId);
                return (
                  <Column
                    key={columnId}
                    columnId={columnId}
                    tasks={columnPrograms}
                    onAddTask={handleAddProgram}
                  >
                    {columnPrograms.map((program, index) => (
                      <Draggable key={program.id} draggableId={program.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <ProgramCard
                              program={program}
                              onClick={() => handleViewProgram(program)}
                              isDragging={snapshot.isDragging}
                              currentUser={currentUser}
                              teamMembers={teamMembers}
                              onMove={handleMoveProgram}
                              currentStatus={columnId}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </Column>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      <ProgramDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
        program={selectedProgram}
        onSave={handleSaveProgram}
        onDelete={handleDeleteProgram}
        teamMembers={teamMembers}
        initialStatus={initialStatus}
        currentUser={currentUser}
      />

      <ProgramFullDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        program={selectedProgram}
        onEdit={(prog) => {
          setSelectedProgram(prog);
          setDetailsDialogOpen(false);
          setProgramDialogOpen(true);
        }}
        currentUser={currentUser}
      />

      <BulkUploadDialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["programs"] });
        }}
      />

      <BulkImportDialog
        open={bulkImportDialogOpen}
        onOpenChange={setBulkImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["programs"] });
        }}
      />
    </div>
  );
}