import React, { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import {
  Scheduler,
  DayView,
  WeekView,
  MonthView,
  Appointments,
  Toolbar,
  ViewSwitcher,
  DateNavigator,
  TodayButton,
  AllDayPanel,
  AppointmentTooltip,
  EditRecurrenceMenu,
  ConfirmationDialog,
  AppointmentForm,
} from "@devexpress/dx-react-scheduler-material-ui";
import { ViewState, EditingState } from "@devexpress/dx-react-scheduler";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import uniqid from "uniqid";
import { ref, onValue, set, update, remove } from "firebase/database";
import database from "./firebaseConfig";

const App = () => {
  const [data, setData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addedAppointment, setAddedAppointment] = useState({});
  const [appointmentChanges, setAppointmentChanges] = useState({});
  const [editingAppointment, setEditingAppointment] = useState(undefined);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [deletedAppointmentId, setDeletedAppointmentId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const appointmentsRef = ref(database, "appointments");
      onValue(
        appointmentsRef,
        (snapshot) => {
          const appointments = snapshot.val()
            ? Object.values(snapshot.val())
            : [];
          setData(appointments);
        },
        (error) => {
          console.error("Error fetching data: ", error);
        }
      );
    };
    fetchData();
  }, []);

  const currentDateChange = (currentDate) => {
    setCurrentDate(currentDate);
  };

  const commitChanges = ({ added, changed, deleted }) => {
    setData((currentData) => {
      let newData = [...currentData];
      if (added) {
        const newAppointment = {
          id: uniqid(),
          startDate: added.startDate.toISOString(),
          endDate: added.endDate.toISOString(),
          title: added.title ? added.title : "Brak tytułu",
          notes: added.notes ? added.notes : "Brak notatki",
          allDay: added.allDay,
        };
        newData = [...newData, newAppointment];
        set(
          ref(database, `appointments/${newAppointment.id}`),
          newAppointment
        ).catch((error) => console.error("Error adding appointment: ", error));
      }
      if (changed) {
        newData = newData.map((appointment) => {
          if (changed[appointment.id]) {
            const updatedAppointment = {
              ...appointment,
              ...changed[appointment.id],
            };
            update(
              ref(database, `appointments/${appointment.id}`),
              updatedAppointment
            ).catch((error) =>
              console.error("Error updating appointment: ", error)
            );
            return updatedAppointment;
          }
          return appointment;
        });
      }
      if (deleted !== undefined) {
        remove(ref(database, `appointments/${deleted}`)).catch((error) =>
          console.error("Error deleting appointment: ", error)
        );
        newData = newData.filter((appointment) => appointment.id !== deleted);
      }
      return newData;
    });
  };

  const toggleConfirmationVisible = () => {
    setConfirmationVisible(!confirmationVisible);
  };

  const commitDeletedAppointment = () => {
    commitChanges({ deleted: deletedAppointmentId });
    setDeletedAppointmentId(null);
    toggleConfirmationVisible();
  };

  const onDeleteButtonClick = (appointmentId) => {
    setDeletedAppointmentId(appointmentId);
    toggleConfirmationVisible();
  };

  return (
    <Paper>
      <Scheduler locale="pl-PL" data={data} height={660}>
        <ViewState
          currentDate={currentDate}
          onCurrentDateChange={currentDateChange}
          defaultCurrentViewName="Week"
        />
        <EditingState
          onCommitChanges={commitChanges}
          addedAppointment={addedAppointment}
          onAddedAppointmentChange={setAddedAppointment}
          appointmentChanges={appointmentChanges}
          onAppointmentChangesChange={setAppointmentChanges}
          editingAppointment={editingAppointment}
          onEditingAppointmentChange={setEditingAppointment}
        />
        <DayView startDayHour={9} endDayHour={14} />
        <WeekView startDayHour={9} endDayHour={19} />
        <MonthView />
        <AllDayPanel />
        <EditRecurrenceMenu />
        <ConfirmationDialog />
        <Toolbar />
        <DateNavigator />
        <TodayButton />
        <ViewSwitcher />
        <Appointments />
        <AppointmentTooltip
          showCloseButton
          showOpenButton
          showDeleteButton
          onDeleteButtonClick={({ id }) => onDeleteButtonClick(id)}
        />
        <AppointmentForm />
      </Scheduler>

      <Dialog open={confirmationVisible} onClose={toggleConfirmationVisible}>
        <DialogTitle>Delete Appointment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this appointment?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={toggleConfirmationVisible}
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={commitDeletedAppointment}
            color="secondary"
            variant="outlined"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default App;
