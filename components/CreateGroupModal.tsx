"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Image as ImageIcon, Plus, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import gsap from "gsap";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (
    name: string,
    description: string,
    imageUrl: string,
    members: string[]
  ) => Promise<void>;
  availableContacts: Array<{
    address: string;
    username: string;
    avatarUrl: string;
  }>;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  availableContacts,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"details" | "members">("details");

  const modalRef = useRef<HTMLDivElement>(null);

  const toggleMember = (address: string) => {
    setSelectedMembers((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateGroup(
        groupName.trim(),
        description.trim(),
        imageUrl.trim(),
        selectedMembers
      );
      // Reset form
      setGroupName("");
      setDescription("");
      setImageUrl("");
      setSelectedMembers([]);
      setStep("details");
      onClose();
    } catch (error) {
      console.error("Failed to create group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    if (groupName.trim().length >= 3) {
      setStep("members");
    }
  };

  const handleBack = () => {
    setStep("details");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/50"
                  >
                    <Users className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Create New Group
                    </h2>
                    <p className="text-sm text-gray-400">
                      {step === "details"
                        ? "Step 1: Group Details"
                        : `Step 2: Add Members (${selectedMembers.length} selected)`}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </motion.button>
              </div>

              {/* Progress Bar */}
              <div className="flex gap-2 mb-6">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: step === "details" ? "50%" : "100%" }}
                  className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex-1"
                />
                <div
                  className={`h-1 rounded-full flex-1 ${
                    step === "members"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600"
                      : "bg-gray-700"
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {step === "details" ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-5"
                    >
                      {/* Group Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Group Image (Optional)
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-gray-700/50 backdrop-blur-xl border-2 border-gray-600/30 flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt="Group"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="Enter image URL"
                              className="w-full bg-gray-800/60 backdrop-blur-xl text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/30 placeholder-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Paste an image URL
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Group Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Group Name *
                        </label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Enter group name (min 3 characters)"
                          className="w-full bg-gray-800/60 backdrop-blur-xl text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/30 placeholder-gray-500"
                          maxLength={50}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {groupName.length}/50 characters
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What's this group about?"
                          rows={3}
                          className="w-full bg-gray-800/60 backdrop-blur-xl text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/30 placeholder-gray-500 resize-none"
                          maxLength={200}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {description.length}/200 characters
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="members"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <p className="text-sm text-gray-400 mb-4">
                        Select contacts to add to the group
                      </p>

                      {availableContacts.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500">No contacts available</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Start a conversation to add contacts
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                          {availableContacts.map((contact, index) => (
                            <motion.div
                              key={contact.address}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => toggleMember(contact.address)}
                              className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                                selectedMembers.includes(contact.address)
                                  ? "bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-500/50"
                                  : "bg-gray-800/40 backdrop-blur-xl border border-gray-700/30 hover:border-gray-600/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {contact.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-white font-medium">
                                      {contact.username}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {contact.address.slice(0, 6)}...
                                      {contact.address.slice(-4)}
                                    </p>
                                  </div>
                                </div>
                                <motion.div
                                  animate={{
                                    scale: selectedMembers.includes(
                                      contact.address
                                    )
                                      ? 1
                                      : 0.8,
                                    opacity: selectedMembers.includes(
                                      contact.address
                                    )
                                      ? 1
                                      : 0.5,
                                  }}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    selectedMembers.includes(contact.address)
                                      ? "bg-blue-500 border-blue-400"
                                      : "border-gray-600"
                                  }`}
                                >
                                  {selectedMembers.includes(
                                    contact.address
                                  ) && (
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700/30">
                {step === "members" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBack}
                    className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-700/70 text-white rounded-xl font-medium transition-all duration-300 backdrop-blur-xl border border-gray-600/30"
                  >
                    Back
                  </motion.button>
                )}

                {step === "details" ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    disabled={groupName.trim().length < 3}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/30 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    Next
                    <Plus className="w-5 h-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={isCreating || selectedMembers.length === 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/30 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        Create Group ({selectedMembers.length})
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.5);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(99, 102, 241, 0.7);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
