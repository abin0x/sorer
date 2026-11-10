import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, Search } from "lucide-react";
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

const DEFAULT_CATEGORIES = [
  "Marketing",
  "Registration",
  "Camps",
  "Clinics",
  "Tournaments",
  "Showcases",
  "Tryout",
  "Fundraiser"
];

export default function CategorySelect({ value, onValueChange, placeholder = "Select category" }) {
  const [open, setOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onValueChange(newCategory.name);
      setNewCategoryName("");
      setIsAddingNew(false);
      toast.success("Category created");
    },
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    createCategoryMutation.mutate({
      name: newCategoryName,
      is_active: true,
    });
  };

  const activeCategories = categories.filter(c => c.is_active);
  const allCategories = [...DEFAULT_CATEGORIES, ...activeCategories.map(c => c.name)];
  const uniqueCategories = [...new Set(allCategories)];
  
  const filteredCategories = uniqueCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between dark:bg-slate-800 dark:border-slate-700"
          >
            {value || placeholder}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search categories..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {filteredCategories.map((cat) => (
                  <CommandItem
                    key={cat}
                    value={cat}
                    onSelect={() => {
                      onValueChange(cat);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    {cat}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              {isAddingNew ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
                    className="h-8 text-sm dark:bg-slate-800 dark:border-slate-700"
                    autoFocus
                  />
                  <Button onClick={handleAddCategory} size="sm" className="h-8 px-2 bg-emerald-700 hover:bg-emerald-800">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button onClick={() => {
                    setIsAddingNew(false);
                    setNewCategoryName("");
                  }} size="sm" variant="ghost" className="h-8 px-2">
                    ✕
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAddingNew(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs justify-start"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add New Category
                </Button>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}